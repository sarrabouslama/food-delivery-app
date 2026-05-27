import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventType, OrderStatus } from '@prisma/client';

import { AuditService } from '../audit/audit.service';
import { SseService } from '../sse/sse.service';

export interface OrderEventPayload {
  orderId: string;
  eventType: EventType;
  fromStatus?: OrderStatus | null;
  toStatus?: OrderStatus | null;
  triggeredBy: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class OrderEventsListener {
  constructor(
    private readonly auditService: AuditService,
    private readonly sseService: SseService,
  ) {}

  @OnEvent(EventType.ORDER_CREATED)
  handleOrderCreated(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.ORDER_CONFIRMED)
  handleOrderConfirmed(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.ORDER_PREPARING)
  handleOrderPreparing(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.ORDER_READY)
  handleOrderReady(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.ORDER_OUT_FOR_DELIVERY)
  handleOrderOutForDelivery(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.ORDER_DELIVERED)
  handleOrderDelivered(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.ORDER_CANCELLED)
  handleOrderCancelled(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.PAYMENT_RECEIVED)
  handlePaymentReceived(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  @OnEvent(EventType.PAYMENT_FAILED)
  handlePaymentFailed(payload: OrderEventPayload) {
    return this.handleEvent(payload);
  }

  private async handleEvent(payload: OrderEventPayload) {
    await this.auditService.logEvent({
      orderId: payload.orderId,
      eventType: payload.eventType,
      fromStatus: payload.fromStatus ?? null,
      toStatus: payload.toStatus ?? null,
      triggeredBy: payload.triggeredBy,
      metadata: payload.metadata,
    });

    this.sseService.emit(payload.orderId, payload);
  }
}