import { Role } from './auth.types';

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

// ── User ────────────────────────────────────────────────────

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
  createdAt: Date;
}

// ── Restaurant ──────────────────────────────────────────────

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
  createdAt: Date;
}

// ── Category ─────────────────────────────────────────────────

export interface Category {
  id: string;
  restaurantId: string;
  name: string;
}

// ── MenuItem ─────────────────────────────────────────────────

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
  menuItemId: string;
  name: string; // denormalized for display
  quantity: number;
  unitPrice: number;
  subtotal: number;
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
  createdAt: Date;
  updatedAt: Date;
}

// ── Payment ──────────────────────────────────────────────────

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  status: PaymentStatus;
  stripePaymentId: string | null;
  paidAt: Date | null;
}
