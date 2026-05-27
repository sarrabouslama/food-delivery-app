import { SseOrderEvent, AuditLogResponse } from '../sse.types';
import { EventType } from '../events.types';
import { OrderStatus } from '../models.types';

export const mockSseEvents: SseOrderEvent[] = [
  {
    type: EventType.ORDER_CREATED,
    orderId: 'order_001',
    fromStatus: null,
    toStatus: OrderStatus.PENDING,
    timestamp: new Date('2024-06-01T10:00:00Z').toISOString(),
  },
  {
    type: EventType.ORDER_CONFIRMED,
    orderId: 'order_001',
    fromStatus: OrderStatus.PENDING,
    toStatus: OrderStatus.CONFIRMED,
    timestamp: new Date('2024-06-01T10:02:00Z').toISOString(),
  },
  {
    type: EventType.ORDER_PREPARING,
    orderId: 'order_001',
    fromStatus: OrderStatus.CONFIRMED,
    toStatus: OrderStatus.PREPARING,
    timestamp: new Date('2024-06-01T10:08:00Z').toISOString(),
  },
];

export const mockAuditLog: AuditLogResponse = {
  orderId: 'order_001',
  history: [
    {
      id: 'audit_001',
      eventType: EventType.ORDER_CREATED,
      fromStatus: null,
      toStatus: OrderStatus.PENDING,
      triggeredBy: 'user_001',
      metadata: null,
      createdAt: new Date('2024-06-01T10:00:00Z').toISOString(),
    },
    {
      id: 'audit_002',
      eventType: EventType.ORDER_CONFIRMED,
      fromStatus: OrderStatus.PENDING,
      toStatus: OrderStatus.CONFIRMED,
      triggeredBy: 'user_002',
      metadata: null,
      createdAt: new Date('2024-06-01T10:02:00Z').toISOString(),
    },
    {
      id: 'audit_003',
      eventType: EventType.PAYMENT_RECEIVED,
      fromStatus: OrderStatus.CONFIRMED,
      toStatus: OrderStatus.CONFIRMED,
      triggeredBy: 'system',
      metadata: { stripePaymentId: 'pi_mock_stripe_001' },
      createdAt: new Date('2024-06-01T10:05:00Z').toISOString(),
    },
    {
      id: 'audit_004',
      eventType: EventType.ORDER_PREPARING,
      fromStatus: OrderStatus.CONFIRMED,
      toStatus: OrderStatus.PREPARING,
      triggeredBy: 'user_002',
      metadata: null,
      createdAt: new Date('2024-06-01T10:08:00Z').toISOString(),
    },
  ],
};
