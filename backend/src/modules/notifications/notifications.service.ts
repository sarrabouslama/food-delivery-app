import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventType, OrderEventPayload } from 'src/contracts/events.types';
import { WsNotificationNew } from 'src/contracts/websocket.types';
import { NotificationType } from '@prisma/client';

const NOTIFICATION_RETENTION_DAYS = 30;

type RecipientRole = 'CUSTOMER' | 'RESTAURANT';

function shortOrderId(orderId: string): string {
  return orderId.slice(-6).toUpperCase();
}

function buildRoleMessage(payload: OrderEventPayload, recipientRole: RecipientRole, restaurantName?: string) {
  const orderRef = `#${shortOrderId(payload.orderId)}`;

  if (recipientRole === 'RESTAURANT') {
    switch (payload.eventType) {
      case EventType.ORDER_CREATED:
        return {
          title: 'New Order Received',
          message: `Order ${orderRef} has been placed and is waiting for your action.`,
        };
      case EventType.ORDER_CONFIRMED:
        return {
          title: 'Order Confirmed',
          message: `Order ${orderRef} is now confirmed and ready for preparation.`,
        };
      case EventType.ORDER_PREPARING:
        return {
          title: 'Preparing Order',
          message: `Order ${orderRef} is currently being prepared.`,
        };
      case EventType.ORDER_READY:
        return {
          title: 'Order Ready',
          message: `Order ${orderRef} is ready for handoff or delivery.`,
        };
      case EventType.ORDER_OUT_FOR_DELIVERY:
        return {
          title: 'Order Out for Delivery',
          message: `Order ${orderRef} is on the way to the customer.`,
        };
      case EventType.ORDER_DELIVERED:
        return {
          title: 'Order Delivered',
          message: `Order ${orderRef} was delivered successfully.`,
        };
      case EventType.ORDER_CANCELLED:
        return {
          title: 'Order Cancelled',
          message: `Order ${orderRef} was cancelled.`,
        };
      case EventType.PAYMENT_RECEIVED:
        return {
          title: 'Payment Received',
          message: `Payment for order ${orderRef} has been confirmed.`,
        };
      case EventType.PAYMENT_FAILED:
        return {
          title: 'Payment Failed',
          message: `Payment for order ${orderRef} failed and needs attention.`,
        };
      default:
        return {
          title: 'Order Update',
          message: `Order ${orderRef} has a new update.`,
        };
    }
  }

  switch (payload.eventType) {
    case EventType.ORDER_CREATED:
      return {
        title: 'Order Placed',
        message: restaurantName
          ? `Your order ${orderRef} was sent to ${restaurantName}.`
          : `Your order ${orderRef} was placed successfully.`,
      };
    case EventType.ORDER_CONFIRMED:
      return {
        title: 'Order Confirmed',
        message: `The restaurant confirmed order ${orderRef}.`,
      };
    case EventType.ORDER_PREPARING:
      return {
        title: 'Being Prepared',
        message: `The kitchen is preparing order ${orderRef}.`,
      };
    case EventType.ORDER_READY:
      return {
        title: 'Order Ready',
        message: `Order ${orderRef} is ready for pickup or delivery.`,
      };
    case EventType.ORDER_OUT_FOR_DELIVERY:
      return {
        title: 'Out for Delivery',
        message: `Order ${orderRef} is on its way.`,
      };
    case EventType.ORDER_DELIVERED:
      return {
        title: 'Order Delivered',
        message: `Order ${orderRef} has been delivered. Enjoy!`,
      };
    case EventType.ORDER_CANCELLED:
      return {
        title: 'Order Cancelled',
        message: `Order ${orderRef} was cancelled.`,
      };
    case EventType.PAYMENT_RECEIVED:
      return {
        title: 'Payment Confirmed',
        message: `Payment for order ${orderRef} was received successfully.`,
      };
    case EventType.PAYMENT_FAILED:
      return {
        title: 'Payment Failed',
        message: `Payment for order ${orderRef} failed. Please try again.`,
      };
    default:
      return {
        title: 'Order Update',
        message: `Your order ${orderRef} has been updated.`,
      };
  }
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) { }

  // Build a WS notification payload from an order event
  async buildFromOrderEvent(payload: OrderEventPayload, recipientRole: RecipientRole): Promise<WsNotificationNew> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: payload.restaurantId },
      select: { name: true },
    });

    const { title, message } = buildRoleMessage(payload, recipientRole, restaurant?.name);

    let type: WsNotificationNew['type'] = 'ORDER_UPDATE';
    if (
      payload.eventType === EventType.PAYMENT_RECEIVED ||
      payload.eventType === EventType.PAYMENT_FAILED
    ) {
      type = 'PAYMENT';
    } else if (payload.eventType === EventType.ORDER_CANCELLED) {
      type = 'SYSTEM';
    }

    return {
      id: crypto.randomUUID(),
      type,
      title,
      message,
      timestamp: payload.timestamp.toISOString(),
    };
  }

  /**
   * Persist notification to database and return WS payload.
   * Defaults to the order customer, but can target another recipient.
   */
  async createAndEmit(
    payload: OrderEventPayload,
    recipientId = payload.customerId,
    recipientRole: RecipientRole = 'CUSTOMER',
  ): Promise<WsNotificationNew> {
    const notification = await this.buildFromOrderEvent(payload, recipientRole);
    const type = notification.type as NotificationType;

    try {
      const persistedNotification = await this.prisma.notification.create({
        data: {
          userId: recipientId,
          type,
          title: notification.title,
          message: notification.message,
          isRead: false,
        },
      });
      this.logger.debug(`Persisted notification for user ${recipientId}`);
      notification.id = persistedNotification.id;
    } catch (error) {
      // Log but don't throw - emit should still happen even if persistence fails
      this.logger.error(
        `Failed to persist notification for user ${recipientId}: ${error}`,
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
}
