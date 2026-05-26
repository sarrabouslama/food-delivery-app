import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '../contracts/models.types';
import { EventType } from '../contracts/events.types';

export class OrderStateMachine {
  private static transitions: Record<OrderStatus, OrderStatus[]> = {
    PENDING: [OrderStatus.CONFIRMED],
    CONFIRMED: [OrderStatus.PREPARING],
    PREPARING: [OrderStatus.READY],
    READY: [OrderStatus.OUT_FOR_DELIVERY],
    OUT_FOR_DELIVERY: [OrderStatus.DELIVERED],
    DELIVERED: [],
    CANCELLED: [],
  };

  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return true; // idempotent
    const allowed = this.transitions[from] || [];
    return allowed.includes(to);
  }

  static validateTransition(from: OrderStatus, to: OrderStatus) {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Invalid status transition from ${from} -> ${to}`,
      );
    }
  }

  static eventForTransition(to: OrderStatus) {
    switch (to) {
      case OrderStatus.PENDING:
        return EventType.ORDER_CREATED;
      case OrderStatus.CONFIRMED:
        return EventType.ORDER_CONFIRMED;
      case OrderStatus.PREPARING:
        return EventType.ORDER_PREPARING;
      case OrderStatus.READY:
        return EventType.ORDER_READY;
      case OrderStatus.OUT_FOR_DELIVERY:
        return EventType.ORDER_OUT_FOR_DELIVERY;
      case OrderStatus.DELIVERED:
        return EventType.ORDER_DELIVERED;
      case OrderStatus.CANCELLED:
        return EventType.ORDER_CANCELLED;
      default:
        return null;
    }
  }
}
