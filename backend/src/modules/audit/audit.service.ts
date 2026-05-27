import { Injectable } from '@nestjs/common';
import { Prisma, EventType, OrderStatus } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

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
    const where: Prisma.AuditLogWhereInput = {
      orderId: data.orderId,
      eventType: data.eventType,
      triggeredBy: data.triggeredBy,
      ...(data.fromStatus === undefined ? {} : { fromStatus: data.fromStatus }),
      ...(data.toStatus === undefined ? {} : { toStatus: data.toStatus }),
    };

    const existing = await this.prisma.auditLog.findFirst({
      where,
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
        metadata:
          data.metadata === undefined
            ? undefined
            : (data.metadata as Prisma.InputJsonValue),
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