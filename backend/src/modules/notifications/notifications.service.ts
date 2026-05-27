import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, OrderEventPayload } from 'src/contracts/events.types';
import { WsNotificationNew } from 'src/contracts/websocket.types';
import { NotificationType } from '@prisma/client';

const NOTIFICATION_RETENTION_DAYS = 30;

// Human-readable messages for each event type
const EVENT_MESSAGES: Record<EventType, { title: string; message: string }> = {
  [EventType.ORDER_CREATED]: { title: 'Order Placed', message: 'Your order has been placed successfully.' },
  [EventType.ORDER_CONFIRMED]: { title: 'Order Confirmed', message: 'The restaurant confirmed your order.' },
  [EventType.ORDER_PREPARING]: { title: 'Being Prepared', message: 'The restaurant is now preparing your order.' },
  [EventType.ORDER_READY]: { title: 'Order Ready', message: 'Your order is ready for pickup/delivery.' },
  [EventType.ORDER_OUT_FOR_DELIVERY]: { title: 'Out for Delivery', message: 'Your order is on its way!' },
  [EventType.ORDER_DELIVERED]: { title: 'Order Delivered', message: 'Your order has been delivered. Enjoy!' },
  [EventType.ORDER_CANCELLED]: { title: 'Order Cancelled', message: 'Your order has been cancelled.' },
  [EventType.PAYMENT_RECEIVED]: { title: 'Payment Confirmed', message: 'Your payment was received successfully.' },
  [EventType.PAYMENT_FAILED]: { title: 'Payment Failed', message: 'Your payment failed. Please try again.' },
};

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) { }

  // Build a WS notification payload from an order event
  buildFromOrderEvent(payload: OrderEventPayload): WsNotificationNew {
    const { title, message } = EVENT_MESSAGES[payload.eventType] ?? {
      title: 'Update',
      message: 'Your order has been updated.',
    };

    const type = this.resolveNotificationType(payload.eventType);

    return {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: payload.timestamp.toISOString(),
    };
  }

  /**
   * Persist notification to database and return WS payload
   * Called by gateway when emitting to client
   */
  async createAndEmit(payload: OrderEventPayload): Promise<WsNotificationNew> {
    const notification = this.buildFromOrderEvent(payload);
    const type = this.resolveNotificationType(payload.eventType) as NotificationType;

    try {
      await this.prisma.notification.create({
        data: {
          userId: payload.customerId,
          type,
          title: notification.title,
          message: notification.message,
          isRead: false,
        },
      });
      this.logger.debug(`Persisted notification for user ${payload.customerId}`);
    } catch (error) {
      // Log but don't throw - emit should still happen even if persistence fails
      this.logger.error(
        `Failed to persist notification for user ${payload.customerId}: ${error}`,
      );
    }

    return notification;
  }

  /**
   * Get recent notification history for a user (for reconnection)
   */
  async getRecentNotifications(
    userId: string,
    limit: number = 10,
  ): Promise<WsNotificationNew[]> {
    try {
      const dbNotifications = await this.prisma.notification.findMany({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return dbNotifications.map(notif => ({
        id: notif.id,
        type: notif.type as WsNotificationNew['type'],
        title: notif.title,
        message: notif.message,
        timestamp: notif.createdAt.toISOString(),
      }));
    } catch (error) {
      this.logger.error(`Failed to retrieve notifications for user ${userId}: ${error}`);
      return [];
    }
  }

  /**
   * Mark notifications as read
   */
  async markAsRead(userId: string, notificationIds: string[]): Promise<void> {
    try {
      await this.prisma.notification.updateMany({
        where: {
          id: { in: notificationIds },
          userId,
        },
        data: { isRead: true },
      });
    } catch (error) {
      this.logger.error(`Failed to mark notifications as read: ${error}`);
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private resolveNotificationType(
    eventType: EventType,
  ): WsNotificationNew['type'] {
    if (
      eventType === EventType.PAYMENT_RECEIVED ||
      eventType === EventType.PAYMENT_FAILED
    ) return 'PAYMENT';

    if (eventType === EventType.ORDER_CANCELLED) return 'SYSTEM';

    return 'ORDER_UPDATE';
  }
}