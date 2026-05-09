
import {
  WsOrderStatusUpdated,
  WsNotificationNew,
  WS_ORDER_STATUS_UPDATED,
  WS_NOTIFICATION_NEW,
} from "../websocket.types";
import { OrderStatus } from "../models.types";

export const mockWsOrderUpdate: WsOrderStatusUpdated = {
  orderId:    "order_001",
  fromStatus: OrderStatus.CONFIRMED,
  toStatus:   OrderStatus.PREPARING,
  timestamp:  new Date("2024-06-01T10:08:00Z").toISOString(),
};

export const mockWsNotification: WsNotificationNew = {
  id:        "notif_001",
  type:      "ORDER_UPDATE",
  title:     "Order Update",
  message:   "Your order is now being prepared!",
  timestamp: new Date("2024-06-01T10:08:00Z").toISOString(),
};

// Mock socket object for frontend development
// Usage: const socket = createMockSocket();
export const createMockSocket = (intervalMs = 4000) => {
  const listeners: Record<string, (data: any) => void> = {};

  const interval = setInterval(() => {
    listeners[WS_ORDER_STATUS_UPDATED]?.(mockWsOrderUpdate);
    listeners[WS_NOTIFICATION_NEW]?.(mockWsNotification);
  }, intervalMs);

  return {
    on:         (event: string, cb: (data: any) => void) => { listeners[event] = cb; },
    off:        (event: string) => { delete listeners[event]; },
    emit:       (event: string, data: any) => console.log("[MockSocket] emit:", event, data),
    disconnect: () => clearInterval(interval),
  };
};

