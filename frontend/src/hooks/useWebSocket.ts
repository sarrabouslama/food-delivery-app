// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'on_the_way' | 'delivered' | 'cancelled';

export interface OrderUpdate {
  orderId: string;
  status: OrderStatus;
  message: string;
  timestamp: string;
  estimatedMinutes?: number;
  driverLocation?: { lat: number; lng: number };
}

interface UseWebSocketOptions {
  url?: string;
  orderId?: string;
  onUpdate?: (update: OrderUpdate) => void;
  useMock?: boolean;
}

const MOCK_UPDATES: Partial<Record<OrderStatus, { message: string; estimatedMinutes?: number }>> = {
  pending:     { message: 'Order received! Waiting for restaurant confirmation.', estimatedMinutes: 35 },
  confirmed:   { message: 'Restaurant confirmed your order!', estimatedMinutes: 30 },
  preparing:   { message: 'Chef is preparing your meal 🍳', estimatedMinutes: 20 },
  ready:       { message: 'Your order is ready! Assigning a driver...', estimatedMinutes: 15 },
  on_the_way:  { message: 'Driver picked up your order. On the way! 🛵', estimatedMinutes: 10 },
  delivered:   { message: 'Order delivered! Enjoy your meal 🎉' },
};

const STATUS_SEQUENCE: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way', 'delivered'];

export function useWebSocket({ url, orderId, onUpdate, useMock = true }: UseWebSocketOptions) {
  const [connected, setConnected] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('pending');
  const [updates, setUpdates] = useState<OrderUpdate[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockIndexRef = useRef(0);

  const pushUpdate = useCallback((update: OrderUpdate) => {
    setCurrentStatus(update.status);
    setUpdates(prev => [...prev, update]);
    onUpdate?.(update);
  }, [onUpdate]);

  // Mock real-time updates (used when backend isn't ready)
  const startMock = useCallback(() => {
    if (!orderId) return;
    setConnected(true);
    mockIndexRef.current = 0;

    // Fire first update immediately
    const first = STATUS_SEQUENCE[0];
    pushUpdate({
      orderId,
      status: first,
      message: MOCK_UPDATES[first]!.message,
      timestamp: new Date().toISOString(),
      estimatedMinutes: MOCK_UPDATES[first]!.estimatedMinutes,
    });

    mockIntervalRef.current = setInterval(() => {
      mockIndexRef.current += 1;
      if (mockIndexRef.current >= STATUS_SEQUENCE.length) {
        clearInterval(mockIntervalRef.current!);
        return;
      }
      const status = STATUS_SEQUENCE[mockIndexRef.current];
      const info = MOCK_UPDATES[status]!;
      pushUpdate({
        orderId,
        status,
        message: info.message,
        timestamp: new Date().toISOString(),
        estimatedMinutes: info.estimatedMinutes,
      });
    }, 5000); // Advance every 5s for demo; set to 60000 for real
  }, [orderId, pushUpdate]);

  useEffect(() => {
    if (!orderId) return;

    if (useMock) {
      startMock();
      return () => {
        if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
        setConnected(false);
      };
    }

    // Real WebSocket connection
    const wsUrl = url || `ws://localhost:3000/ws`;
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        ws.send(JSON.stringify({ event: 'subscribe_order', orderId }));
      };

      ws.onmessage = (event) => {
        try {
          const data: OrderUpdate = JSON.parse(event.data);
          if (data.orderId === orderId) pushUpdate(data);
        } catch (e) {
          console.error('WebSocket parse error', e);
        }
      };

      ws.onclose = () => setConnected(false);
      ws.onerror = () => {
        console.warn('WebSocket error, falling back to mock');
        setConnected(false);
        startMock();
      };
    } catch {
      startMock();
    }

    return () => {
      wsRef.current?.close();
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, [orderId, url, useMock, pushUpdate, startMock]);

  const sendMessage = useCallback((event: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ event, ...(data as Record<string, unknown>) }));
    }
  }, []);

  return { connected, currentStatus, updates, sendMessage };
}
