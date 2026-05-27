import { PrismaClient, Role, OrderStatus, PaymentStatus, EventType } from '@prisma/client';
import { mockCustomer, mockRestaurantOwner } from '../src/contracts/mocks/mock-user';
import { mockRestaurant, mockCategory, mockMenuItems, mockOrder } from '../src/contracts/mocks/mock-order';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding from mocks directory...');

  // 1. Clean existing database records in correct order of dependency
  await prisma.auditLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.menuItem.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.restaurant.deleteMany({});
  await prisma.userProfile.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('🧹 Cleaned existing database tables.');

  // 2. Hash password for local login (using password123 as standard)
  const passwordHash = await bcrypt.hash('password123', 10);

  // 3. Seed mockCustomer
  const customer = await prisma.user.create({
    data: {
      id: mockCustomer.id,
      email: mockCustomer.email,
      passwordHash,
      role: Role.CUSTOMER,
      createdAt: mockCustomer.createdAt,
      profile: mockCustomer.profile
        ? {
            create: {
              id: mockCustomer.profile.id,
              firstName: mockCustomer.profile.firstName,
              lastName: mockCustomer.profile.lastName,
              phone: mockCustomer.profile.phone,
              address: mockCustomer.profile.address,
              avatarUrl: mockCustomer.profile.avatarUrl,
            },
          }
        : undefined,
    },
  });
  console.log(`│ Seeded Customer User: ${customer.email} (ID: ${customer.id})`);

  // 4. Seed mockRestaurantOwner
  const owner = await prisma.user.create({
    data: {
      id: mockRestaurantOwner.id,
      email: mockRestaurantOwner.email,
      passwordHash,
      role: Role.RESTAURANT,
      createdAt: mockRestaurantOwner.createdAt,
      profile: mockRestaurantOwner.profile
        ? {
            create: {
              id: mockRestaurantOwner.profile.id,
              firstName: mockRestaurantOwner.profile.firstName,
              lastName: mockRestaurantOwner.profile.lastName,
              phone: mockRestaurantOwner.profile.phone,
              address: mockRestaurantOwner.profile.address,
              avatarUrl: mockRestaurantOwner.profile.avatarUrl,
            },
          }
        : undefined,
    },
  });
  console.log(`│ Seeded Restaurant Owner User: ${owner.email} (ID: ${owner.id})`);

  // 5. Seed mockRestaurant
  const restaurant = await prisma.restaurant.create({
    data: {
      id: mockRestaurant.id,
      ownerId: mockRestaurant.ownerId,
      name: mockRestaurant.name,
      description: mockRestaurant.description,
      category: mockRestaurant.category,
      imageUrl: mockRestaurant.imageUrl,
      address: mockRestaurant.address,
      phone: mockRestaurant.phone,
      isOpen: mockRestaurant.isOpen,
      rating: mockRestaurant.rating,
      createdAt: mockRestaurant.createdAt,
    },
  });
  console.log(`│ Seeded Restaurant: ${restaurant.name} (ID: ${restaurant.id})`);

  // 6. Seed mockCategory
  const category = await prisma.category.create({
    data: {
      id: mockCategory.id,
      restaurantId: mockCategory.restaurantId,
      name: mockCategory.name,
    },
  });
  console.log(`│ Seeded Menu Category: ${category.name} (ID: ${category.id})`);

  // 7. Seed mockMenuItems
  for (const item of mockMenuItems) {
    const createdItem = await prisma.menuItem.create({
      data: {
        id: item.id,
        restaurantId: item.restaurantId,
        categoryId: item.categoryId,
        name: item.name,
        description: item.description,
        price: item.price,
        imageUrl: item.imageUrl,
        isAvailable: item.isAvailable,
      },
    });
    console.log(`│ Seeded Menu Item: ${createdItem.name} (ID: ${createdItem.id})`);
  }

  // 8. Seed mockOrder
  const order = await prisma.order.create({
    data: {
      id: mockOrder.id,
      customerId: mockOrder.customerId,
      restaurantId: mockOrder.restaurantId,
      status: mockOrder.status as OrderStatus,
      totalPrice: mockOrder.totalPrice,
      notes: mockOrder.notes,
      address: mockOrder.address,
      createdAt: mockOrder.createdAt,
      updatedAt: mockOrder.updatedAt,
    },
  });
  console.log(`│ Seeded Order: (ID: ${order.id}) with Status: ${order.status}`);

  // 9. Seed mockOrder items
  for (const item of mockOrder.items) {
    const orderItem = await prisma.orderItem.create({
      data: {
        id: item.id,
        orderId: order.id,
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      },
    });
    console.log(`│   - Added Order Item: ${orderItem.menuItemId} x${orderItem.quantity}`);
  }

  // 10. Seed mockOrder payment
  if (mockOrder.payment) {
    const payment = await prisma.payment.create({
      data: {
        id: mockOrder.payment.id,
        orderId: order.id,
        amount: mockOrder.payment.amount,
        status: mockOrder.payment.status as PaymentStatus,
        stripePaymentId: mockOrder.payment.stripePaymentId,
        paidAt: mockOrder.payment.paidAt,
      },
    });
    console.log(`│ Seeded Payment for Order: (ID: ${payment.id}) with Status: ${payment.status}`);
  }

  // 11. Seed AuditLog entries to make order progress logs realistic
  await prisma.auditLog.createMany({
    data: [
      {
        orderId: order.id,
        eventType: EventType.ORDER_CREATED,
        fromStatus: null,
        toStatus: OrderStatus.PENDING,
        triggeredBy: order.customerId,
        metadata: { info: 'Order created by customer' },
        createdAt: new Date(order.createdAt.getTime() - 5000),
      },
      {
        orderId: order.id,
        eventType: EventType.PAYMENT_RECEIVED,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.PENDING,
        triggeredBy: 'system',
        metadata: { stripePaymentId: mockOrder.payment?.stripePaymentId },
        createdAt: mockOrder.payment?.paidAt || order.createdAt,
      },
      {
        orderId: order.id,
        eventType: EventType.ORDER_PREPARING,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.PREPARING,
        triggeredBy: 'system',
        metadata: { info: 'Auto-advanced order status after payment confirmation' },
        createdAt: order.createdAt,
      },
    ],
  });

  console.log('│ Seeded Audit Logs representing order history.');
  console.log('🎉 Seeding successfully completed! Database matches team mock contracts.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
