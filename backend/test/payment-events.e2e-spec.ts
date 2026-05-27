import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { raw } from 'express';
import { IoAdapter } from '@nestjs/platform-socket.io';
import * as request from 'supertest';
import * as io from 'socket.io-client';
import * as crypto from 'crypto';
import * as http from 'http';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/modules/prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';

// Standard HMAC-SHA256 Stripe Webhook Signature Generator
function computeStripeSignature(payload: string, secret: string, timestamp: number): string {
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  return `t=${timestamp},v1=${signature}`;
}

// Simple Helper to capture SSE events
function listenToSse(orderId: string, port: number): Promise<{ events: any[]; close: () => void }> {
  const events: any[] = [];
  const req = http.get(`http://localhost:${port}/api/sse/orders/${orderId}`, (res) => {
    res.on('data', (chunk) => {
      const dataStr = chunk.toString();
      const lines = dataStr.split('\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          try {
            const jsonStr = line.replace('data:', '').trim();
            const parsed = JSON.parse(jsonStr);
            events.push(parsed);
          } catch (e) {
            // Ignore incomplete chunks or non-JSON content
          }
        }
      }
    });
  });

  return Promise.resolve({
    events,
    close: () => {
      req.destroy();
    },
  });
}

describe('Stripe Payment Webhook, WebSockets & SSE (Integration)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let wsClient: io.Socket;
  let token: string;
  const PORT = 3012; // Dedicated port to avoid conflicts
  const ORDER_ID = 'order_001';
  const CUSTOMER_ID = 'user_001';
  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_5c869a75ce27ba9b2fb6d565f899387a51fb9bf2548ea9f1233a39e2d165eae2';

  beforeAll(async () => {
    // 1. Create NestJS Testing Module
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // 2. Configure prefix and raw body parser for Stripe webhook signatures
    app.setGlobalPrefix('api');
    app.use('/api/webhooks/payment', raw({ type: 'application/json' }));
    app.useWebSocketAdapter(new IoAdapter(app));

    // 3. Start listening on TCP port so WebSocket and SSE connections can be established
    await app.listen(PORT);

    prisma = app.get(PrismaService);
    jwtService = app.get(JwtService);

    // 4. Programmatically sign a perfectly valid JWT token for user_001
    token = jwtService.sign(
      {
        sub: CUSTOMER_ID,
        email: 'customer@test.com',
        role: 'CUSTOMER',
      },
      {
        secret: process.env.JWT_SECRET || 'example_jwt_secret_replace_me',
      },
    );
  });

  afterAll(async () => {
    if (wsClient && wsClient.connected) {
      wsClient.disconnect();
    }
    await app.close();
  });

  beforeEach(async () => {
    // Reset order and payment to PENDING status before each test case
    await prisma.order.update({
      where: { id: ORDER_ID },
      data: { status: OrderStatus.PENDING },
    });

    await prisma.payment.update({
      where: { orderId: ORDER_ID },
      data: {
        status: PaymentStatus.PENDING,
        stripePaymentId: null,
        paidAt: null,
      },
    });

    // Clean notifications and audit logs for order_001 to keep tests isolated
    await prisma.notification.deleteMany({
      where: { userId: CUSTOMER_ID },
    });

    await prisma.auditLog.deleteMany({
      where: {
        orderId: ORDER_ID,
        eventType: { in: ['PAYMENT_RECEIVED', 'PAYMENT_FAILED'] },
      },
    });
  });

  describe('WebSocket & SSE Real-time Updates', () => {
    beforeEach(async () => {
      // Connect and Subscribe WebSocket client robustly
      return new Promise<void>((resolve, reject) => {
        wsClient = io.connect(`http://localhost:${PORT}`, {
          query: { token },
          transports: ['websocket'],
          forceNew: true,
        });

        wsClient.on('connect', () => {
          wsClient.emit('order:subscribe', { orderId: ORDER_ID }, (ack: any) => {
            resolve();
          });
        });

        wsClient.on('connect_error', (err) => {
          reject(new Error(`WebSocket connection error: ${err.message}`));
        });
      });
    });

    afterEach(() => {
      if (wsClient && wsClient.connected) {
        wsClient.disconnect();
      }
    });

    it('should process charge.succeeded, update database, and emit PAYMENT_RECEIVED to WebSocket and SSE', async () => {
      // 1. Setup SSE Listener
      const sse = await listenToSse(ORDER_ID, PORT);

      // 2. Register WebSocket event listeners
      const wsStatusPromise = new Promise<any>((resolve) => {
        wsClient.on('order:status_updated', (data) => resolve(data));
      });
      const wsNotifPromise = new Promise<any>((resolve) => {
        wsClient.on('notification:new', (data) => resolve(data));
      });

      // 3. Construct Stripe Webhook Payload
      const chargeSucceededPayload = {
        id: 'evt_test_charge_succeeded_999',
        type: 'charge.succeeded',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'ch_test_stripe_charge_succeeded',
            amount: 3097, // $30.97 * 100
            created: Math.floor(Date.now() / 1000),
            metadata: { orderId: ORDER_ID },
          },
        },
      };

      const rawPayload = JSON.stringify(chargeSucceededPayload);
      const sig = computeStripeSignature(rawPayload, WEBHOOK_SECRET, chargeSucceededPayload.created);

      // 4. Send Stripe Webhook POST Request
      const response = await request(app.getHttpServer())
        .post('/api/webhooks/payment')
        .set('stripe-signature', sig)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // 5. Verify Database updates
      // Auto-advance eligible orders from PENDING -> PREPARING upon successful payment
      const order = await prisma.order.findUnique({ where: { id: ORDER_ID } });
      const payment = await prisma.payment.findUnique({ where: { orderId: ORDER_ID } });

      expect(order?.status).toBe(OrderStatus.PREPARING);
      expect(payment?.status).toBe(PaymentStatus.PAID);
      expect(payment?.stripePaymentId).toBe('ch_test_stripe_charge_succeeded');

      // 6. Verify WebSocket receives the event
      const wsStatusData = await wsStatusPromise;
      expect(wsStatusData).toBeDefined();
      expect(wsStatusData.orderId).toBe(ORDER_ID);
      expect(wsStatusData.fromStatus).toBe(OrderStatus.PENDING);
      expect(wsStatusData.toStatus).toBe(OrderStatus.PREPARING);

      const wsNotifData = await wsNotifPromise;
      expect(wsNotifData).toBeDefined();
      expect(wsNotifData.userId).toBe(CUSTOMER_ID);
      expect(wsNotifData.title).toContain('Payment Received');
      expect(wsNotifData.message).toContain('payment of $30.97 was successful');

      // 7. Verify Server-Sent Events (SSE) receives the event
      await new Promise((r) => setTimeout(r, 200)); // wait brief moment for SSE streams
      sse.close();

      expect(sse.events.length).toBeGreaterThanOrEqual(1);
      const ssePaymentReceivedEvent = sse.events.find(
        (e) => e.eventType === 'PAYMENT_RECEIVED'
      );
      expect(ssePaymentReceivedEvent).toBeDefined();
      expect(ssePaymentReceivedEvent.orderId).toBe(ORDER_ID);
    });

    it('should process charge.failed, update database payment status, and emit PAYMENT_FAILED to WebSocket and SSE', async () => {
      // 1. Setup SSE Listener
      const sse = await listenToSse(ORDER_ID, PORT);

      // 2. Register WebSocket event listeners
      const wsStatusPromise = new Promise<any>((resolve) => {
        wsClient.on('order:status_updated', (data) => resolve(data));
      });
      const wsNotifPromise = new Promise<any>((resolve) => {
        wsClient.on('notification:new', (data) => resolve(data));
      });

      // 3. Construct Stripe Webhook Payload for Failure
      const chargeFailedPayload = {
        id: 'evt_test_charge_failed_999',
        type: 'charge.failed',
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: 'ch_test_stripe_charge_failed',
            amount: 3097,
            created: Math.floor(Date.now() / 1000),
            metadata: { orderId: ORDER_ID },
          },
        },
      };

      const rawPayload = JSON.stringify(chargeFailedPayload);
      const sig = computeStripeSignature(rawPayload, WEBHOOK_SECRET, chargeFailedPayload.created);

      // 4. Send Stripe Webhook POST Request
      const response = await request(app.getHttpServer())
        .post('/api/webhooks/payment')
        .set('stripe-signature', sig)
        .set('Content-Type', 'application/json')
        .send(rawPayload);

      expect(response.status).toBe(200);
      expect(response.body.ok).toBe(true);

      // 5. Verify Database updates
      // Failed payment should NOT auto-advance order, it stays PENDING but payment is FAILED
      const order = await prisma.order.findUnique({ where: { id: ORDER_ID } });
      const payment = await prisma.payment.findUnique({ where: { orderId: ORDER_ID } });

      expect(order?.status).toBe(OrderStatus.PENDING);
      expect(payment?.status).toBe(PaymentStatus.FAILED);
      expect(payment?.stripePaymentId).toBe('ch_test_stripe_charge_failed');

      // 6. Verify WebSocket receives the events
      const wsStatusData = await wsStatusPromise;
      expect(wsStatusData).toBeDefined();
      expect(wsStatusData.orderId).toBe(ORDER_ID);
      expect(wsStatusData.fromStatus).toBe(OrderStatus.PENDING);
      expect(wsStatusData.toStatus).toBe(OrderStatus.PENDING); // no status transition for order, remains pending

      const wsNotifData = await wsNotifPromise;
      expect(wsNotifData).toBeDefined();
      expect(wsNotifData.userId).toBe(CUSTOMER_ID);
      expect(wsNotifData.title).toContain('Payment Failed');
      expect(wsNotifData.message).toContain('payment of $30.97 has failed');

      // 7. Verify Server-Sent Events (SSE) receives the event
      await new Promise((r) => setTimeout(r, 200));
      sse.close();

      expect(sse.events.length).toBeGreaterThanOrEqual(1);
      const ssePaymentFailedEvent = sse.events.find(
        (e) => e.eventType === 'PAYMENT_FAILED'
      );
      expect(ssePaymentFailedEvent).toBeDefined();
      expect(ssePaymentFailedEvent.orderId).toBe(ORDER_ID);
    });
  });
});
