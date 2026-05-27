import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '../lib/socket';

export type OrderStatus =
  | 'pending' | 'confirmed' | 'preparing' | 'ready'
  | 'on_the_way' | 'delivered' | 'cancelled';

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
  estimatedMinutes?: number;
}

export interface WsNotification {
  id: string;
  type: 'ORDER_UPDATE' | 'PAYMENT' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
}

// Backend sends uppercase; map to frontend lowercase equivalents
const STATUS_MAP: Record<string, OrderStatus> = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  OUT_FOR_DELIVERY: 'on_the_way',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
};

const STATUS_MESSAGES: Record<OrderStatus, string> = {
  pending:    'Order received — waiting for restaurant confirmation.',
  confirmed:  'Restaurant confirmed your order!',
  preparing:  'Chef is preparing your meal…',
  ready:      'Your order is ready! Driver on the way…',
  on_the_way: 'Driver picked up your order — on the way!',
  delivered:  'Order delivered! Enjoy your meal!',
  cancelled:  'Order has been cancelled.',
};

const ETA: Partial<Record<OrderStatus, number>> = {
  pending: 35, confirmed: 30, preparing: 20, ready: 15, on_the_way: 10,
};

interface UseWebSocketOptions {
  orderId?: string;
  onUpdate?: (u: OrderUpdate) => void;
  onNotification?: (n: WsNotification) => void;
  initialStatus?: OrderStatus;
}

export function useWebSocket({
  orderId,
  onUpdate,
  onNotification,
  initialStatus = 'pending',
}: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>(initialStatus);
  const [updates, setUpdates] = useState<OrderUpdate[]>([]);

  const cbUpdate = useRef(onUpdate);
  const cbNotif  = useRef(onNotification);
  // Track whether a real WS event has arrived; only update from initialStatus if not
  const hasReceivedUpdate = useRef(false);

  useEffect(() => { cbUpdate.current = onUpdate; }, [onUpdate]);
  useEffect(() => { cbNotif.current  = onNotification; }, [onNotification]);

  // Sync initialStatus → currentStatus whenever the loaded order data arrives,
  // but stop doing so once a live WebSocket update has been received.
  useEffect(() => {
    if (!hasReceivedUpdate.current) {
      setCurrentStatus(initialStatus);
    }
  }, [initialStatus]);

  const push = useCallback((u: OrderUpdate) => {
    hasReceivedUpdate.current = true;
    setCurrentStatus(u.status);
    setUpdates(p => [...p, u]);
    cbUpdate.current?.(u);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) setConnected(true);

    if (orderId) socket.emit('order:subscribe', { orderId });

    const onStatusUpdate = (d: { orderId: string; toStatus: string; timestamp: string }) => {
      if (orderId && d.orderId !== orderId) return;
      const status = STATUS_MAP[d.toStatus] ?? ('pending' as OrderStatus);
      push({
        orderId: d.orderId,
        status,
        message: STATUS_MESSAGES[status],
        timestamp: d.timestamp,
        estimatedMinutes: ETA[status],
      });
    };

    const onNotif = (n: WsNotification) => cbNotif.current?.(n);

    socket.on('order:status_updated', onStatusUpdate);
    socket.on('notification:new', onNotif);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('order:status_updated', onStatusUpdate);
      socket.off('notification:new', onNotif);
      if (orderId) socket.emit('order:unsubscribe', { orderId });
    };
  }, [orderId, push]);

  return { connected, currentStatus, updates };
}
