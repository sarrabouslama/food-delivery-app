import { OrderStatus } from "./models.types";

export enum EventType {
  ORDER_CREATED          = "ORDER_CREATED",
  ORDER_CONFIRMED        = "ORDER_CONFIRMED",
  ORDER_PREPARING        = "ORDER_PREPARING",
  ORDER_READY            = "ORDER_READY",
  ORDER_OUT_FOR_DELIVERY = "ORDER_OUT_FOR_DELIVERY",
  ORDER_DELIVERED        = "ORDER_DELIVERED",
  ORDER_CANCELLED        = "ORDER_CANCELLED",
  PAYMENT_RECEIVED       = "PAYMENT_RECEIVED",
  PAYMENT_FAILED         = "PAYMENT_FAILED",
}

export enum PayementType {
  SUCCEEDED = "SUCCEEDED",
  FAILED   = "FAILED",
}

// Internal event emitted by Member 3
// Consumed by Members 4 and 5 via @nestjs/event-emitter
export interface OrderEventPayload {
  eventType:   EventType;
  orderId:     string;
  customerId:  string;
  restaurantId: string;
  fromStatus:  OrderStatus | null;  // null on ORDER_CREATED
  toStatus:    OrderStatus;
  triggeredBy: string;              // userId or "system"
  timestamp:   Date;
  metadata?:   Record<string, any>; // e.g. stripePaymentId, reason
}

// Stripe-style webhook body (POST /webhooks/payment)
export interface PaymentWebhookDto {
  stripePaymentId: string;
  orderId:         string;
  status:          PayementType;
  amount:          number;
  timestamp:       string; // ISO string from Stripe
}