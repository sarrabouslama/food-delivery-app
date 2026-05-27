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
import {
  WS_ORDER_SUBSCRIBE,
  WS_ORDER_UNSUBSCRIBE,
  WS_ORDER_STATUS_UPDATED,
  WS_NOTIFICATION_NEW,
  WsOrderSubscribe,
  WsOrderUnsubscribe,
} from 'src/contracts/websocket.types';
import { OrderEventPayload, EventType } from 'src/contracts/events.types';

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
  ) { }

  // ── Lifecycle ────────────────────────────────────────────────────────────

  afterInit(server: Server) {
    this.logger.log('WebSocket gateway initialized');

    // TODO (M1): replace mock auth middleware with real JWT verification
    // For now, accept all connections and extract userId from query param
    server.use((socket, next) => {
      const token = socket.handshake.query.token as string;
      if (!token) return next(new WsException('Missing token'));

      // MOCK: accept any token during development
      // Real implementation: verify JWT and attach user to socket.data
      socket.data.userId = this.wsService.extractUserIdFromToken(token);
      next();
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data.userId as string;

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

    this.logger.log(`Client connected: ${client.id} (user: ${userId})`);
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
  handleOrderSubscribe(
    @MessageBody() body: WsOrderSubscribe,
    @ConnectedSocket() client: Socket,
  ) {
    if (!body?.orderId) throw new WsException('orderId is required');

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

    // 2. Create, persist, and push a notification to the customer's personal room
    const notification = await this.notificationsService.createAndEmit(payload);

    this.server
      .to(`user:${payload.customerId}`)
      .emit(WS_NOTIFICATION_NEW, notification);

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

    const notification = await this.notificationsService.createAndEmit(payload);
    this.server
      .to(`user:${payload.customerId}`)
      .emit(WS_NOTIFICATION_NEW, notification);
  }

  @OnEvent('PAYMENT_FAILED')
  async handlePaymentFailed(payload: OrderEventPayload) {
    // Validate event payload
    const validation = this.wsService.validateEventPayload(payload);
    if (!validation.valid) {
      this.logger.error(`Invalid payment event payload: ${validation.errors.join(', ')}`);
      return;
    }

    const notification = await this.notificationsService.createAndEmit(payload);
    this.server
      .to(`user:${payload.customerId}`)
      .emit(WS_NOTIFICATION_NEW, notification);
  }
}