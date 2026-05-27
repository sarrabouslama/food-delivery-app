const io = require('socket.io-client');

// Event constants from websocket.types
const WS_NOTIFICATION_NEW = 'notification:new';
const WS_ORDER_STATUS_UPDATED = 'order:status_updated';

// Backend runs on port 3000 by default
const socket = io('http://localhost:3000', {
    query: {
        token: 'test_token',
    },
});

socket.on('connect', () => {
    console.log('✓ Connected to WebSocket');
});

socket.on(WS_NOTIFICATION_NEW, (data) => {
    console.log('📬 Notification:', JSON.stringify(data, null, 2));
});

socket.on(WS_ORDER_STATUS_UPDATED, (data) => {
    console.log('📦 Order Status:', JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

socket.on('error', (error) => {
    console.error('❌ Error:', error);
});

// Keep the process running
process.stdin.resume();
