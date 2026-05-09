import { EventType } from "./events.types";
import { OrderStatus } from "./models.types";

// ── SSE Stream ───────────────────────────────────────────────
// Endpoint: GET /sse/orders/:orderId
// Headers:  Authorization: Bearer <JWT>
//           Accept: text/event-stream

// Each SSE message has this shape (JSON-parsed from `data:` field)
export interface SseOrderEvent {
  type:      EventType;
  orderId:   string;
  fromStatus: OrderStatus | null;
  toStatus:  OrderStatus;
  timestamp: string; // ISO string
}

// ── Audit Log REST ───────────────────────────────────────────
// Endpoint: GET /audit/orders/:orderId
// Returns full history of status changes for an order

export interface AuditLogEntry {
  id:          string;
  eventType:   EventType;
  fromStatus:  OrderStatus | null;
  toStatus:    OrderStatus;
  triggeredBy: string;           // userId or "system"
  metadata:    Record<string, any> | null;
  createdAt:   string;           // ISO string
}

export interface AuditLogResponse {
  orderId: string;
  history: AuditLogEntry[];
}