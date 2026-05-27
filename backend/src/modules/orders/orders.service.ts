import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, EventType } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderEventPayload } from 'src/contracts/events.types';
import { OrderStateMachine } from './order-state.machine';
const Stripe = require('stripe');

@Injectable()
export class OrdersService {
  private stripe: any;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    this.stripe = new Stripe(secretKey);
  }

  // ── Create Order ────────────────────────────────────────────

  async createOrder(customerId: string, dto: CreateOrderDto) {
    // 1. Verify restaurant exists
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });
    if (!restaurant) {
      throw new NotFoundException('Restaurant not found');
    }

    // 2. Load all menu items to calculate price and validate
    const menuItemIds = dto.items.map((i) => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: menuItemIds } },
    });

    if (menuItems.length !== dto.items.length) {
      throw new NotFoundException('One or more menu items not found');
    }

    let totalPrice = 0;
    const itemsToCreate: {
      menuItemId: string;
      quantity: number;
      unitPrice: number;
      subtotal: number;
    }[] = [];

    for (const itemDto of dto.items) {
      const menuItem = menuItems.find((m) => m.id === itemDto.menuItemId);
      if (!menuItem) {
        throw new NotFoundException(`Menu item ${itemDto.menuItemId} not found`);
      }
      if (menuItem.restaurantId !== dto.restaurantId) {
        throw new BadRequestException(`Menu item ${menuItem.name} does not belong to the selected restaurant`);
      }
      if (!menuItem.isAvailable) {
        throw new BadRequestException(`Menu item ${menuItem.name} is currently not available`);
      }

      const unitPrice = Number(menuItem.price);
      const subtotal = unitPrice * itemDto.quantity;
      totalPrice += subtotal;

      itemsToCreate.push({
        menuItemId: itemDto.menuItemId,
        quantity: itemDto.quantity,
        unitPrice,
        subtotal,
      });
    }

    // 3. Create Order, OrderItems, Payment and AuditLog in a transaction
    const newOrder = await this.prisma.$transaction(async (tx) => {
      // Create the order
      const order = await tx.order.create({
        data: {
          customerId,
          restaurantId: dto.restaurantId,
          status: OrderStatus.PENDING,
          totalPrice,
          address: dto.address,
          notes: dto.notes,
          items: {
            create: itemsToCreate.map((it) => ({
              menuItemId: it.menuItemId,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              subtotal: it.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
        },
      });

      // Create initial payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          amount: totalPrice,
          status: PaymentStatus.PENDING,
        },
      });

      // Record first audit log entry
      await tx.auditLog.create({
        data: {
          orderId: order.id,
          eventType: EventType.ORDER_CREATED,
          toStatus: OrderStatus.PENDING,
          triggeredBy: customerId,
        },
      });

      return order;
    });

    // 4. Emit ORDER_CREATED Event
    const payload: OrderEventPayload = {
      eventType: EventType.ORDER_CREATED as any,
      orderId: newOrder.id,
      customerId: newOrder.customerId,
      restaurantId: newOrder.restaurantId,
      fromStatus: null,
      toStatus: OrderStatus.PENDING as any,
      triggeredBy: customerId,
      timestamp: new Date(),
    };

    this.eventEmitter.emit(EventType.ORDER_CREATED, payload);

    return this.findOrderById(newOrder.id, customerId, 'CUSTOMER');
  }

  // ── Update Status ───────────────────────────────────────────

  async updateStatus(
    id: string,
    toStatus: OrderStatus,
    triggeredBy = 'system',
  ): Promise<OrderEventPayload> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const fromStatus = order.status;
    OrderStateMachine.validateTransition(fromStatus as any, toStatus as any);

    // Save transition in DB
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: { status: toStatus },
    });

    const eventType = OrderStateMachine.eventForTransition(toStatus as any) ?? EventType.ORDER_PREPARING;

    // Save AuditLog
    await this.prisma.auditLog.create({
      data: {
        orderId: order.id,
        eventType: eventType as any,
        fromStatus: fromStatus,
        toStatus: toStatus,
        triggeredBy,
      },
    });

    const payload: OrderEventPayload = {
      eventType: eventType as any,
      orderId: order.id,
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      fromStatus: fromStatus as any,
      toStatus: toStatus as any,
      triggeredBy,
      timestamp: new Date(),
    };

    // Emit using EventType as the event name
    this.eventEmitter.emit(eventType, payload);

    if (toStatus === OrderStatus.DELIVERED && order.payment?.status !== PaymentStatus.PAID) {
      const now = new Date();

      await this.prisma.payment.update({
        where: { orderId: order.id },
        data: {
          status: PaymentStatus.PAID,
          paidAt: now,
          stripePaymentId: order.payment?.stripePaymentId ?? null,
        },
      });

      const paymentPayload: OrderEventPayload = {
        eventType: EventType.PAYMENT_RECEIVED as any,
        orderId: order.id,
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        fromStatus: toStatus as any,
        toStatus: toStatus as any,
        triggeredBy,
        timestamp: now,
        metadata: { autoPaid: true },
      };

      this.eventEmitter.emit(EventType.PAYMENT_RECEIVED, paymentPayload);
    }

    return payload;
  }

  // ── Stripe Checkout Session ───────────────────────────────

  async createStripeCheckoutSession(
    orderId: string,
    customerId: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        items: {
          include: { menuItem: true },
        },
        payment: true,
        restaurant: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.customerId !== customerId) {
      throw new ForbiddenException('You do not have permission to pay for this order');
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: order.id,
      metadata: {
        orderId: order.id,
        restaurantId: order.restaurantId,
      },
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(item.unitPrice) * 100),
          product_data: {
            name: item.menuItem.name,
            description: item.menuItem.description ?? undefined,
          },
        },
      })),
    });

    return {
      ok: true,
      sessionId: session.id,
      url: session.url,
      orderId: order.id,
    };
  }

  // ── Payment Webhook Handler ─────────────────────────────────

  async handlePaymentWebhook(webhook: {
    stripePaymentId: string;
    orderId: string;
    status: string;
    amount: number;
    timestamp: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: webhook.orderId },
      include: { payment: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const isSucceeded = webhook.status === 'SUCCEEDED';
    const payStatus = isSucceeded ? PaymentStatus.PAID : PaymentStatus.FAILED;

    // Update payment record in database
    await this.prisma.payment.update({
      where: { orderId: order.id },
      data: {
        status: payStatus,
        stripePaymentId: webhook.stripePaymentId,
        paidAt: isSucceeded ? new Date(webhook.timestamp) : null,
      },
    });

    // Create Audit Log
    const eventType = isSucceeded ? EventType.PAYMENT_RECEIVED : EventType.PAYMENT_FAILED;
    await this.prisma.auditLog.create({
      data: {
        orderId: order.id,
        eventType,
        fromStatus: order.status,
        toStatus: order.status,
        triggeredBy: 'system',
        metadata: { stripePaymentId: webhook.stripePaymentId },
      },
    });

    const paymentPayload: OrderEventPayload = {
      eventType: eventType as any,
      orderId: order.id,
      customerId: order.customerId,
      restaurantId: order.restaurantId,
      fromStatus: order.status as any,
      toStatus: order.status as any,
      triggeredBy: 'system',
      timestamp: new Date(webhook.timestamp),
      metadata: { stripePaymentId: webhook.stripePaymentId },
    };

    this.eventEmitter.emit(eventType, paymentPayload);

    // Auto-advance eligible orders: if currently CONFIRMED or PENDING, move to PREPARING
    if (
      isSucceeded &&
      (order.status === OrderStatus.CONFIRMED || order.status === OrderStatus.PENDING)
    ) {
      try {
        const preparingPayload = await this.updateStatus(order.id, OrderStatus.PREPARING, 'system');
        return { paymentPayload, preparingPayload };
      } catch (err) {
        // validation may prevent transition; still return paymentPayload
        return { paymentPayload };
      }
    }

    return { paymentPayload };
  }

  // ── Find Orders ─────────────────────────────────────────────

  async findOrders(userId: string, role: string) {
    if (role === 'CUSTOMER') {
      return this.prisma.order.findMany({
        where: { customerId: userId },
        include: {
          items: {
            include: { menuItem: true },
          },
          payment: true,
          restaurant: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (role === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (!restaurant) return [];

      return this.prisma.order.findMany({
        where: { restaurantId: restaurant.id },
        include: {
          items: {
            include: { menuItem: true },
          },
          payment: true,
          customer: {
            include: { profile: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return [];
  }

  async findOrderById(id: string, userId: string, role: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { menuItem: true },
        },
        payment: true,
        restaurant: true,
        customer: {
          include: { profile: true },
        },
        auditLogs: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Access control check
    if (role === 'CUSTOMER' && order.customerId !== userId) {
      throw new ForbiddenException('You do not have permission to view this order');
    }

    if (role === 'RESTAURANT') {
      const restaurant = await this.prisma.restaurant.findUnique({
        where: { ownerId: userId },
      });
      if (!restaurant || order.restaurantId !== restaurant.id) {
        throw new ForbiddenException('You do not have permission to view this order');
      }
    }

    return order;
  }
}
