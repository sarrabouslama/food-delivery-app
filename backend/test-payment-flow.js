const io = require('socket.io-client');
const crypto = require('crypto');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

// --- CONSTANTS ---
const PORT = process.env.PORT || 3000;
const ORDER_ID = 'd06efd3a-14d2-4e4b-97e2-cf324905d4aa'; // Valid UUID
const CUSTOMER_ID = 'user_001';

console.log('🚀 Loading Stripe Payment WebSockets & SSE Test Environment...');

// --- LOAD ENVIRONMENT VARIABLES ---
const envPath = path.join(__dirname, '.env');
const envConfig = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
const env = {};
envConfig.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
        let value = match[2] ? match[2].trim() : '';
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.substring(1, value.length - 1);
        }
        env[match[1]] = value;
    }
});

const JWT_SECRET = env.JWT_SECRET || 'example_jwt_secret_replace_me';
const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET || 'whsec_5c869a75ce27ba9b2fb6d565f899387a51fb9bf2548ea9f1233a39e2d165eae2';

console.log(`🔑 Loaded JWT Secret: ...${JWT_SECRET.substring(Math.max(0, JWT_SECRET.length - 4))}`);
console.log(`🛡️ Loaded Webhook Secret: ...${WEBHOOK_SECRET.substring(Math.max(0, WEBHOOK_SECRET.length - 4))}`);

// --- PURE JS JWT SIGNER ---
function generateToken(userId, email, role, secret) {
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
        sub: userId,
        email: email,
        role: role,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };

    const base64UrlHeader = Buffer.from(JSON.stringify(header)).toString('base64url');
    const base64UrlPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${base64UrlHeader}.${base64UrlPayload}`)
        .digest('base64url');

    return `${base64UrlHeader}.${base64UrlPayload}.${signature}`;
}

const token = generateToken(CUSTOMER_ID, 'customer@test.com', 'CUSTOMER', JWT_SECRET);

// --- STRIPE SIGNATURE GENERATOR ---
function computeStripeSignature(payload, secret, timestamp) {
    const signedPayload = `${timestamp}.${payload}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');
    return `t=${timestamp},v1=${signature}`;
}

// --- MAIN RUNNER ---
async function run() {
    const prisma = new PrismaClient();

    try {
        console.log('\n🧹 Preparing test database records with valid UUIDs...');
        
        // Clean up any leftovers
        await prisma.auditLog.deleteMany({ where: { orderId: ORDER_ID } });
        await prisma.payment.deleteMany({ where: { orderId: ORDER_ID } });
        await prisma.orderItem.deleteMany({ where: { orderId: ORDER_ID } });
        await prisma.order.deleteMany({ where: { id: ORDER_ID } });
        
        // Create a new order with valid UUID
        await prisma.order.create({
            data: {
                id: ORDER_ID,
                customerId: CUSTOMER_ID,
                restaurantId: 'rest_001',
                status: 'PENDING',
                totalPrice: 30.97,
                address: '12 Rue de la Liberté, Tunis',
                notes: 'Test order',
                items: {
                    create: [
                        {
                            id: 'oi_test_001',
                            menuItemId: 'item_001',
                            quantity: 2,
                            unitPrice: 12.99,
                            subtotal: 25.98
                        }
                    ]
                },
                payment: {
                    create: {
                        id: 'pay_test_001',
                        amount: 30.97,
                        status: 'PENDING'
                    }
                }
            }
        });
        console.log('✅ Created test order and payment with valid UUIDs.');

        // 1. Establish SSE Connection
        console.log('\n📡 Connecting to SSE stream...');
        const sseEvents = [];
        const sseReq = http.get(`http://localhost:${PORT}/api/sse/orders/${ORDER_ID}`, (res) => {
            res.on('data', (chunk) => {
                const lines = chunk.toString().split('\n');
                lines.forEach(line => {
                    if (line.startsWith('data:')) {
                        try {
                            const parsed = JSON.parse(line.replace('data:', '').trim());
                            sseEvents.push(parsed);
                            console.log(`📡 [SSE Event] Received: ${parsed.eventType} (Status: ${parsed.toStatus})`);
                        } catch (e) { }
                    }
                });
            });
        });

        // 2. Establish WebSocket Connection
        console.log('\n🔌 Connecting to WebSocket Server...');
        const socket = io(`http://localhost:${PORT}`, {
            query: { token },
            transports: ['websocket'],
            forceNew: true
        });

        const wsEvents = [];
        const wsNotifications = [];

        await new Promise((resolve, reject) => {
            const onConnect = () => {
                console.log('🔌 [WebSocket] Connected successfully.');
                socket.emit('order:subscribe', { orderId: ORDER_ID }, (ack) => {
                    console.log('🔌 [WebSocket] Subscribed to order room.');
                    resolve();
                });
            };

            if (socket.connected) {
                onConnect();
            } else {
                socket.on('connect', onConnect);
            }

            socket.on('connect_error', (err) => {
                reject(new Error(`WebSocket Connection failed: ${err.message}`));
            });
        });

        socket.on('order:status_updated', (data) => {
            wsEvents.push(data);
            console.log(`🔌 [WS Event] order:status_updated: Status changed from ${data.fromStatus} → ${data.toStatus}`);
        });

        socket.on('notification:new', (data) => {
            wsNotifications.push(data);
            console.log(`🔌 [WS Notification] Title: "${data.title}" - Message: "${data.message}"`);
        });

        // ==========================================
        // TEST CASE 1: Successful Payment (charge.succeeded)
        // ==========================================
        console.log('\n💳 [Test Case 1] Sending Stripe charge.succeeded webhook event...');
        const successPayload = {
            id: 'evt_test_charge_succeeded_' + Date.now(),
            type: 'charge.succeeded',
            created: Math.floor(Date.now() / 1000),
            data: {
                object: {
                    id: 'ch_test_stripe_success_999',
                    amount: 3097, // $30.97 * 100
                    created: Math.floor(Date.now() / 1000),
                    metadata: { orderId: ORDER_ID }
                }
            }
        };

        const successRaw = JSON.stringify(successPayload);
        const successSig = computeStripeSignature(successRaw, WEBHOOK_SECRET, successPayload.created);

        await sendWebhook(successRaw, successSig);

        // Wait a short moment for real-time events to process
        await new Promise(r => setTimeout(r, 1000));

        // Assert DB Updates
        const successOrder = await prisma.order.findUnique({ where: { id: ORDER_ID } });
        const successPayment = await prisma.payment.findUnique({ where: { orderId: ORDER_ID } });

        console.log('\n📊 [Test Case 1 Assertions]');
        assert('Order status advanced to PREPARING', successOrder.status === 'PREPARING');
        assert('Payment status updated to PAID', successPayment.status === 'PAID');
        assert('Payment record holds correct stripe ID', successPayment.stripePaymentId === 'ch_test_stripe_success_999');
        assert('WebSocket client received status update', wsEvents.length > 0 && wsEvents[wsEvents.length - 1].toStatus === 'PREPARING');
        assert('WebSocket client received payment success notification', wsNotifications.length > 0 && wsNotifications[wsNotifications.length - 1].title.includes('Received'));
        assert('SSE stream received PAYMENT_RECEIVED event', sseEvents.some(e => e.eventType === 'PAYMENT_RECEIVED'));

        // Clear events for failure test
        wsEvents.length = 0;
        wsNotifications.length = 0;

        // Reset database to pending before failure test
        await prisma.order.update({
            where: { id: ORDER_ID },
            data: { status: 'PENDING' }
        });

        // ==========================================
        // TEST CASE 2: Failed Payment (charge.failed)
        // ==========================================
        console.log('\n💳 [Test Case 2] Sending Stripe charge.failed webhook event...');
        const failedPayload = {
            id: 'evt_test_charge_failed_' + Date.now(),
            type: 'charge.failed',
            created: Math.floor(Date.now() / 1000),
            data: {
                object: {
                    id: 'ch_test_stripe_failed_888',
                    amount: 3097,
                    created: Math.floor(Date.now() / 1000),
                    metadata: { orderId: ORDER_ID }
                }
            }
        };

        const failedRaw = JSON.stringify(failedPayload);
        const failedSig = computeStripeSignature(failedRaw, WEBHOOK_SECRET, failedPayload.created);

        await sendWebhook(failedRaw, failedSig);

        // Wait a short moment
        await new Promise(r => setTimeout(r, 1000));

        // Assert DB Updates
        const failedOrder = await prisma.order.findUnique({ where: { id: ORDER_ID } });
        const failedPayment = await prisma.payment.findUnique({ where: { orderId: ORDER_ID } });

        console.log('\n📊 [Test Case 2 Assertions]');
        assert('Order status remains PENDING', failedOrder.status === 'PENDING');
        assert('Payment status updated to FAILED', failedPayment.status === 'FAILED');
        assert('Payment record holds correct stripe ID', failedPayment.stripePaymentId === 'ch_test_stripe_failed_888');
        assert('WebSocket client received status update', wsEvents.length > 0 && wsEvents[wsEvents.length - 1].toStatus === 'PENDING');
        assert('WebSocket client received payment failure notification', wsNotifications.length > 0 && wsNotifications[wsNotifications.length - 1].title.includes('Failed'));
        assert('SSE stream received PAYMENT_FAILED event', sseEvents.some(e => e.eventType === 'PAYMENT_FAILED'));

        // --- CLEANUP ---
        console.log('\n🧹 Cleaning up connections...');
        socket.disconnect();
        sseReq.destroy();
        
        // Clean up database test records
        await prisma.auditLog.deleteMany({ where: { orderId: ORDER_ID } });
        await prisma.payment.deleteMany({ where: { orderId: ORDER_ID } });
        await prisma.orderItem.deleteMany({ where: { orderId: ORDER_ID } });
        await prisma.order.deleteMany({ where: { id: ORDER_ID } });
        
        console.log('✨ All tests completed successfully!');

    } catch (err) {
        console.error('\n❌ Test execution failed:', err);
    } finally {
        await prisma.$disconnect();
    }
}

// --- HELPER FUNCTION TO SEND WEBHOOK POST ---
function sendWebhook(body, signature) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: PORT,
            path: '/api/webhooks/payment',
            method: 'POST',
            headers: {
                'stripe-signature': signature,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`✅ Webhook request successful (HTTP 200): ${data}`);
                    resolve(JSON.parse(data));
                } else {
                    reject(new Error(`Webhook failed with HTTP ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// --- SIMPLE ASSERTION LOGGER ---
function assert(description, condition) {
    if (condition) {
        console.log(`  🟢 [PASS] ${description}`);
    } else {
        console.log(`  🔴 [FAIL] ${description}`);
        process.exitCode = 1;
    }
}

run();
