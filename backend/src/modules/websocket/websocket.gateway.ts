import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
  WsException,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { WebsocketService } from './websocket.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  WS_ORDER_SUBSCRIBE,
  WS_ORDER_UNSUBSCRIBE,
  WS_ORDER_STATUS_UPDATED,
  WS_NOTIFICATION_NEW,
  WsOrderSubscribe,
  WsOrderUnsubscribe,
} from 'src/contracts/websocket.types';
import { OrderEventPayload, EventType } from 'src/contracts/events.types';
import { Role } from 'src/contracts/auth.types';

// ── Gateway ────────────────────────────────────────────────────────────────
// Listens on ws://localhost:3000 (same port as HTTP via socket.io adapter)
// Namespace: /   (default)
// ──────────────────────────────────────────────────────────────────────────

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3001',
    credentials: true,
  },
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  constructor(
    private readonly wsService: WebsocketService,
    private readonly notificationsService: NotificationsService,
    private readonly prisma: PrismaService,
  ) { }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');

    server.use((socket, next) => {
      const rawToken = socket.handshake.query.token;
      const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      if (!token) return next(new WsException('Missing token'));

      const user = this.wsService.extractUserContextFromToken(token);
      socket.data.user = user;
      socket.data.userId = user.userId;
      socket.data.email = user.email;
      socket.data.role = user.role;
      next();
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId as string;
    const role = client.data.role as string | undefined;

    if (!userId) {
      this.logger.warn(`Client ${client.id} has no userId — disconnecting`);
      client.disconnect();
      return;
    }

    // Check connection limit
    if (!this.wsService.canConnect(userId)) {
      const currentCount = this.wsService.getConnectionCountForUser(userId);
      const maxCount = this.wsService.getMaxConnectionsPerUser();
      this.logger.warn(
        `User ${userId} exceeded max connections (${currentCount}/${maxCount}) — disconnecting`,
      );
      client.disconnect(true);
      return;
    }

    this.wsService.registerClient(client.id, userId);

    // Auto-join a personal room so we can target this user directly
    client.join(`user:${userId}`);

    // Send recent notification history on reconnection
    this.sendNotificationHistory(client, userId);

    this.logger.log(`Client connected: ${client.id} (user: ${userId}, role: ${role})`);
  }

  handleDisconnect(client: Socket) {
    this.wsService.removeClient(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Send notification history to client on connection
   */
  private async sendNotificationHistory(client: Socket, userId: string): Promise<void> {
    try {
      const history = await this.notificationsService.getRecentNotifications(userId, 5);
      if (history.length > 0) {
        // Emit as array to indicate these are historical
        client.emit('notifications:history', history);
        this.logger.debug(`Sent ${history.length} historical notifications to user ${userId}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send notification history: ${error}`);
      // Don't break connection if history fails
    }
  }

  // ── Client → Server messages ─────────────────────────────────────────────

  @SubscribeMessage(WS_ORDER_SUBSCRIBE)
  async handleOrderSubscribe(
    @MessageBody() body: WsOrderSubscribe,
    @ConnectedSocket() client: Socket,
  ) {
    if (!body?.orderId) throw new WsException('orderId is required');

    const userId = client.data.userId as string | undefined;
    const role = client.data.role as Role | undefined;
    if (!userId || !role) throw new WsException('Unauthorized');

    const canSubscribe = await this.canUserSubscribeToOrder(userId, role, body.orderId);
    if (!canSubscribe) {
      this.logger.warn(
        `Rejected order subscription: client ${client.id} user ${userId} order ${body.orderId}`,
      );
      throw new WsException('You do not have permission to subscribe to this order');
    }

    client.join(`order:${body.orderId}`);
    this.logger.log(`Client ${client.id} subscribed to order:${body.orderId}`);

    return { event: 'subscribed', data: { orderId: body.orderId } };
  }

  @SubscribeMessage(WS_ORDER_UNSUBSCRIBE)
  handleOrderUnsubscribe(
    @MessageBody() body: WsOrderUnsubscribe,
    @ConnectedSocket() client: Socket,
  ) {
    if (!body?.orderId) throw new WsException('orderId is required');

    client.leave(`order:${body.orderId}`);
    this.logger.log(`Client ${client.id} unsubscribed from order:${body.orderId}`);

    return { event: 'unsubscribed', data: { orderId: body.orderId } };
  }

  private async canUserSubscribeToOrder(
    userId: string,
    role: Role,
    orderId: string,
  ): Promise<boolean> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        customerId: true,
        restaurant: {
          select: {
            ownerId: true,
          },
        },
      },
    });

    if (!order) return false;

    if (role === Role.CUSTOMER) return order.customerId === userId;
    if (role === Role.RESTAURANT) return order.restaurant.ownerId === userId;

    return false;
  }

  // ── Server → Client broadcasts ───────────────────────────────────────────

  @OnEvent('ORDER_CREATED')
  @OnEvent('ORDER_CONFIRMED')
  @OnEvent('ORDER_PREPARING')
  @OnEvent('ORDER_READY')
  @OnEvent('ORDER_OUT_FOR_DELIVERY')
  @OnEvent('ORDER_DELIVERED')
  @OnEvent('ORDER_CANCELLED')
  async handleOrderEvent(payload: OrderEventPayload) {
    // Validate event payload
    const validation = this.wsService.validateEventPayload(payload);
    if (!validation.valid) {
      this.logger.error(`Invalid order event payload: ${validation.errors.join(', ')}`);
      return;
    }

    // 1. Broadcast status update to everyone in the order room
    this.server.to(`order:${payload.orderId}`).emit(WS_ORDER_STATUS_UPDATED, {
      orderId: payload.orderId,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
      timestamp: payload.timestamp.toISOString(),
    });

    // 2. Create and push notification to the customer
    const notification = await this.notificationsService.createAndEmit(payload);
    this.server
      .to(`user:${payload.customerId}`)
      .emit(WS_NOTIFICATION_NEW, notification);

    // 3. Create and push notification to the restaurant owner
    try {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: payload.restaurantId },
        select: { ownerId: true },
      });

      if (restaurant?.ownerId) {
        const restaurantNotification = await this.notificationsService.createAndEmit(
          payload,
          restaurant.ownerId,
        );
        this.server
          .to(`user:${restaurant.ownerId}`)
          .emit(WS_NOTIFICATION_NEW, restaurantNotification);
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify restaurant owner for order ${payload.orderId}: ${error}`,
      );
      // Don't break the customer notification flow if restaurant owner notification fails
    }

    this.logger.log(
      `Emitted ${WS_ORDER_STATUS_UPDATED} for order:${payload.orderId} → ${payload.toStatus}`,
    );
  }

  @OnEvent('PAYMENT_RECEIVED')
  async handlePaymentReceived(payload: OrderEventPayload) {
    // Validate event payload
    const validation = this.wsService.validateEventPayload(payload);
    if (!validation.valid) {
      this.logger.error(`Invalid payment event payload: ${validation.errors.join(', ')}`);
      return;
    }

    // 1. Notify customer about payment
    const notification = await this.notificationsService.createAndEmit(payload);
    this.server
      .to(`user:${payload.customerId}`)
      .emit(WS_NOTIFICATION_NEW, notification);

    // 2. Broadcast payment update to the order room (all subscribers)
    this.server.to(`order:${payload.orderId}`).emit(WS_ORDER_STATUS_UPDATED, {
      orderId: payload.orderId,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
      timestamp: payload.timestamp.toISOString(),
    });

    // 3. Notify restaurant owner about payment
    try {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: payload.restaurantId },
        select: { ownerId: true },
      });

      if (restaurant?.ownerId) {
        const restaurantNotification = await this.notificationsService.createAndEmit(
          payload,
          restaurant.ownerId,
        );
        this.server
          .to(`user:${restaurant.ownerId}`)
          .emit(WS_NOTIFICATION_NEW, restaurantNotification);
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify restaurant owner for order ${payload.orderId}: ${error}`,
      );
    }
  }

  @OnEvent('PAYMENT_FAILED')
  async handlePaymentFailed(payload: OrderEventPayload) {
    // Validate event payload
    const validation = this.wsService.validateEventPayload(payload);
    if (!validation.valid) {
      this.logger.error(`Invalid payment event payload: ${validation.errors.join(', ')}`);
      return;
    }

    // 1. Notify customer about payment failure
    const notification = await this.notificationsService.createAndEmit(payload);
    this.server
      .to(`user:${payload.customerId}`)
      .emit(WS_NOTIFICATION_NEW, notification);

    // 2. Broadcast payment failure to the order room (all subscribers)
    this.server.to(`order:${payload.orderId}`).emit(WS_ORDER_STATUS_UPDATED, {
      orderId: payload.orderId,
      fromStatus: payload.fromStatus,
      toStatus: payload.toStatus,
      timestamp: payload.timestamp.toISOString(),
    });

    // 3. Notify restaurant owner about payment failure
    try {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { id: payload.restaurantId },
        select: { ownerId: true },
      });

      if (restaurant?.ownerId) {
        const restaurantNotification = await this.notificationsService.createAndEmit(
          payload,
          restaurant.ownerId,
        );
        this.server
          .to(`user:${restaurant.ownerId}`)
          .emit(WS_NOTIFICATION_NEW, restaurantNotification);
      }
    } catch (error) {
      this.logger.error(
        `Failed to notify restaurant owner for order ${payload.orderId}: ${error}`,
      );
    }
  }
}
