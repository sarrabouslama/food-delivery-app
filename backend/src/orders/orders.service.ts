import { Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Order, OrderStatus } from '../contracts/models.types';
import { mockOrder } from '../contracts/mocks';
import { OrderStateMachine } from './order-state.machine';
import { EventType, OrderEventPayload } from '../contracts/events.types';

@Injectable()
export class OrdersService {
  private orders = new Map<string, Order>();

  constructor(private eventEmitter: EventEmitter2) {
    // seed in-memory store with the provided mock (clone to avoid mutation)
    this.orders.set(mockOrder.id, { ...mockOrder });
  }

  updateStatus(
    id: string,
    toStatus: OrderStatus,
    triggeredBy = 'system',
  ): OrderEventPayload {
    const order = this.orders.get(id);
    if (!order) throw new NotFoundException('Order not found');

    const fromStatus = order.status;
    OrderStateMachine.validateTransition(fromStatus, toStatus);

    order.status = toStatus;
    order.updatedAt = new Date();
    this.orders.set(id, order);

    const eventType = OrderStateMachine.eventForTransition(toStatus) ?? EventType.ORDER_PREPARING;

    const payload: OrderEventPayload = {
      eventType,
      orderId: order.id,
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      fromStatus: fromStatus,
      toStatus: toStatus,
      triggeredBy,
      timestamp: new Date(),
    };

    // Emit using EventType as the event name so listeners can subscribe by enum value
    this.eventEmitter.emit(eventType, payload);

    return payload;
  }

  // Handle payment webhook: update payment info, emit PAYMENT_RECEIVED, and auto-advance
  handlePaymentWebhook(webhook: {
    stripePaymentId: string;
    orderId: string;
    status: string;
    amount: number;
    timestamp: string;
  }) {
    const order = this.orders.get(webhook.orderId);
    if (!order) throw new NotFoundException('Order not found');

    // update mock payment object if exists
    if (!order.payment) {
      order.payment = {
        id: `pay_${order.id}`,
        orderId: order.id,
        amount: webhook.amount,
        status: webhook.status === 'SUCCEEDED' ? 'PAID' : 'FAILED',
        stripePaymentId: webhook.stripePaymentId,
        paidAt: webhook.status === 'SUCCEEDED' ? new Date(webhook.timestamp) : null,
      } as any;
    } else {
      order.payment.status = webhook.status === 'SUCCEEDED' ? ("PAID" as any) : ("FAILED" as any);
      order.payment.stripePaymentId = webhook.stripePaymentId;
      order.payment.paidAt = webhook.status === 'SUCCEEDED' ? new Date(webhook.timestamp) : null;
    }

    order.updatedAt = new Date();
    this.orders.set(order.id, order);

    const paymentPayload: OrderEventPayload = {
      eventType: EventType.PAYMENT_RECEIVED,
      orderId: order.id,
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      fromStatus: order.status,
      toStatus: order.status,
      triggeredBy: 'system',
      timestamp: new Date(webhook.timestamp),
      metadata: { stripePaymentId: webhook.stripePaymentId },
    };

    this.eventEmitter.emit(EventType.PAYMENT_RECEIVED, paymentPayload);

    // Auto-advance eligible orders: if currently CONFIRMED or PENDING, move to PREPARING
    if (
      order.status === OrderStatus.CONFIRMED ||
      order.status === OrderStatus.PENDING
    ) {
      try {
        const preparingPayload = this.updateStatus(order.id, OrderStatus.PREPARING, 'system');
        return { paymentPayload, preparingPayload };
      } catch (err) {
        // validation may prevent transition; still return paymentPayload
        return { paymentPayload };
      }
    }

    return { paymentPayload };
  }
}
