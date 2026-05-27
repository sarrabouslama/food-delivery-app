// ── Enums ────────────────────────────────────────────────────

export type Role = 'CUSTOMER' | 'RESTAURANT';

export type OrderStatus = 
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentStatus = 
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'REFUNDED';

export type PaymentMethod = 'CASH' | 'STRIPE';

export type EventType = 
  | 'ORDER_CREATED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_PREPARING'
  | 'ORDER_READY'
  | 'ORDER_OUT_FOR_DELIVERY'
  | 'ORDER_DELIVERED'
  | 'ORDER_CANCELLED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_FAILED';

// ── Auth ─────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

// ── User ─────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  address: string | null;
}

export interface User {
  id: string;
  email: string;
  role: Role;
  profile: UserProfile | null;
  createdAt: string;
}

// ── Restaurant ───────────────────────────────────────────────

export interface Restaurant {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  address: string;
  phone: string | null;
  isOpen: boolean;
  rating: number;
  createdAt: string;
  categories?: Category[];
  menuItems?: MenuItem[];
}

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
  menuItems?: MenuItem[];
}

export interface MenuItem {
  id: string;
  restaurantId: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
}

// ── Order ────────────────────────────────────────────────────

export interface OrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  menuItem?: MenuItem;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  stripePaymentId: string | null;
  paidAt: string | null;
}

export interface AuditLog {
  id: string;
  orderId: string;
  eventType: EventType;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus | null;
  triggeredBy: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Order {
  id: string;
  customerId: string;
  restaurantId: string;
  status: OrderStatus;
  totalPrice: number;
  notes: string | null;
  address: string;
  items: OrderItem[];
  payment: Payment | null;
  auditLogs?: AuditLog[];
  restaurant?: Restaurant;
  customer?: User;
  createdAt: string;
  updatedAt: string;
}

// ── Notification ─────────────────────────────────────────────

export interface Notification {
  id: string;
  type: 'ORDER_UPDATE' | 'PAYMENT' | 'PROMOTION' | 'SYSTEM';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

// ── WebSocket Events ─────────────────────────────────────────

export interface WsOrderStatusUpdated {
  orderId: string;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  timestamp: string;
}

// ── Cart (frontend-only) ─────────────────────────────────────

export interface CartItem {
  menuItem: MenuItem;
  quantity: number;
}
