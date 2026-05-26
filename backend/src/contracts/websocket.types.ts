import { OrderStatus } from './models.types';

// ── Events the SERVER emits → CLIENT listens ────────────────

// Emitted when an order status changes
export const WS_ORDER_STATUS_UPDATED = 'order:status_updated';
export interface WsOrderStatusUpdated {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  timestamp: string; // ISO string
}

// Emitted when a new notification arrives
export const WS_NOTIFICATION_NEW = 'notification:new';
export interface WsNotificationNew {
  id: string;
  type: 'ORDER_UPDATE' | 'PAYMENT' | 'PROMOTION' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string; // ISO string
}

// ── Events the CLIENT emits → SERVER listens ────────────────

// Client subscribes to a specific order's updates
export const WS_ORDER_SUBSCRIBE = 'order:subscribe';
export interface WsOrderSubscribe {
  orderId: string;
}

// Client unsubscribes from a specific order's updates
export const WS_ORDER_UNSUBSCRIBE = 'order:unsubscribe';
export interface WsOrderUnsubscribe {
  orderId: string;
}

// ── Connection ───────────────────────────────────────────────

// Query params on WebSocket handshake
// ws://localhost:3000?token=<JWT>
export interface WsHandshakeQuery {
  token: string;
}
