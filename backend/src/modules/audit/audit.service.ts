import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

export type EventType = 'ORDER_CREATED' | 'ORDER_CONFIRMED' | 'ORDER_PREPARING' | 'ORDER_READY' | 'ORDER_OUT_FOR_DELIVERY' | 'ORDER_DELIVERED' | 'ORDER_CANCELLED' | 'PAYMENT_RECEIVED' | 'PAYMENT_FAILED';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface LogEventInput {
  orderId: string;
  eventType: EventType;
  fromStatus?: OrderStatus | null;
  toStatus?: OrderStatus | null;
  triggeredBy: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logEvent(data: LogEventInput) {
    const where = {
      orderId: data.orderId,
      eventType: data.eventType,
      triggeredBy: data.triggeredBy,
      ...(data.fromStatus === undefined ? {} : { fromStatus: data.fromStatus }),
      ...(data.toStatus === undefined ? {} : { toStatus: data.toStatus }),
    };

    const existing = await this.prisma.auditLog.findFirst({
      where: where as any,
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.auditLog.create({
      data: {
        orderId: data.orderId,
        eventType: data.eventType,
        fromStatus: data.fromStatus ?? null,
        toStatus: data.toStatus ?? null,
        triggeredBy: data.triggeredBy,
        metadata: data.metadata ?? undefined,
      },
    });
  }

  async getOrderAuditLog(orderId: string) {
    return this.prisma.auditLog.findMany({
      where: { orderId },
      orderBy: { createdAt: 'asc' },
    });
  }
}