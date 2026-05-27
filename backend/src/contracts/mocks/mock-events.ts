import { EventType } from '../events.types';
import { OrderStatus } from '../models.types';
import { OrderEventPayload } from '../events.types';

export const mockOrderEvents: OrderEventPayload[] = [
  {
    eventType: EventType.ORDER_CREATED,
    orderId: 'order_001',
    customerId: 'user_001',
    restaurantId: 'rest_001',
    fromStatus: null,
    toStatus: OrderStatus.PENDING,
    triggeredBy: 'user_001',
    timestamp: new Date('2024-06-01T10:00:00Z'),
  },
  {
    eventType: EventType.ORDER_CONFIRMED,
    orderId: 'order_001',
    customerId: 'user_001',
    restaurantId: 'rest_001',
    fromStatus: OrderStatus.PENDING,
    toStatus: OrderStatus.CONFIRMED,
    triggeredBy: 'user_002',
    timestamp: new Date('2024-06-01T10:02:00Z'),
  },
  {
    eventType: EventType.PAYMENT_RECEIVED,
    orderId: 'order_001',
    customerId: 'user_001',
    restaurantId: 'rest_001',
    fromStatus: OrderStatus.CONFIRMED,
    toStatus: OrderStatus.CONFIRMED,
    triggeredBy: 'system',
    timestamp: new Date('2024-06-01T10:05:00Z'),
    metadata: { stripePaymentId: 'pi_mock_stripe_001' },
  },
  {
    eventType: EventType.ORDER_PREPARING,
    orderId: 'order_001',
    customerId: 'user_001',
    restaurantId: 'rest_001',
    fromStatus: OrderStatus.CONFIRMED,
    toStatus: OrderStatus.PREPARING,
    triggeredBy: 'user_002',
    timestamp: new Date('2024-06-01T10:08:00Z'),
  },
];

// Helper: simulate a stream of events with delays (for dev/testing)
export const simulateOrderEvents = (
  emit: (event: OrderEventPayload) => void,
  intervalMs = 3000,
) => {
  let i = 0;
  const interval = setInterval(() => {
    if (i >= mockOrderEvents.length) {
      clearInterval(interval);
      return;
    }
    emit(mockOrderEvents[i]);
    i++;
  }, intervalMs);

  return () => clearInterval(interval); // returns cleanup fn
};
