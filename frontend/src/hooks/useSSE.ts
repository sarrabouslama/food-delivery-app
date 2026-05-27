// src/hooks/useSSE.ts
import { useEffect, useRef, useState, useCallback } from 'react';

export interface AuditEvent {
  id: string;
  orderId: string;
  action: string;
  actor: string;
  actorRole: 'customer' | 'restaurant' | 'driver' | 'system';
  timestamp: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

interface UseSSEOptions {
  url?: string;
  orderId?: string;
  useMock?: boolean;
}

const MOCK_AUDIT_EVENTS: Omit<AuditEvent, 'id' | 'timestamp'>[] = [
  { orderId: '', action: 'ORDER_CREATED', actor: 'Customer', actorRole: 'customer', details: 'Order placed for 2 items - $24.50' },
  { orderId: '', action: 'PAYMENT_PROCESSED', actor: 'Payment System', actorRole: 'system', details: 'Payment of $24.50 confirmed via card ending in 4242' },
  { orderId: '', action: 'ORDER_CONFIRMED', actor: 'Bella Italia', actorRole: 'restaurant', details: 'Restaurant accepted the order' },
  { orderId: '', action: 'PREPARATION_STARTED', actor: 'Bella Italia', actorRole: 'restaurant', details: 'Chef started preparing the order' },
  { orderId: '', action: 'DRIVER_ASSIGNED', actor: 'System', actorRole: 'system', details: 'Driver Alex M. assigned to the order' },
  { orderId: '', action: 'ORDER_PICKED_UP', actor: 'Alex M.', actorRole: 'driver', details: 'Driver picked up the order from restaurant' },
  { orderId: '', action: 'ORDER_DELIVERED', actor: 'Alex M.', actorRole: 'driver', details: 'Order successfully delivered to customer' },
];

export function useSSE({ url, orderId, useMock = true }: UseSSEOptions) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const mockIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mockIndexRef = useRef(0);

  const addEvent = useCallback((event: AuditEvent) => {
    setEvents(prev => [event, ...prev]);
  }, []);

  const startMock = useCallback(() => {
    if (!orderId) return;
    setConnected(true);
    mockIndexRef.current = 0;

    // Push first event immediately
    addEvent({
      id: `evt-0`,
      ...MOCK_AUDIT_EVENTS[0],
      orderId,
      timestamp: new Date().toISOString(),
    });

    mockIntervalRef.current = setInterval(() => {
      mockIndexRef.current += 1;
      if (mockIndexRef.current >= MOCK_AUDIT_EVENTS.length) {
        clearInterval(mockIntervalRef.current!);
        setConnected(false);
        return;
      }
      const template = MOCK_AUDIT_EVENTS[mockIndexRef.current];
      addEvent({
        id: `evt-${mockIndexRef.current}`,
        ...template,
        orderId,
        timestamp: new Date().toISOString(),
      });
    }, 5500);
  }, [orderId, addEvent]);

  useEffect(() => {
    if (!orderId) return;

    if (useMock) {
      startMock();
      return () => {
        if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
      };
    }

    const sseUrl = url || `http://localhost:3000/sse/audit?orderId=${orderId}`;
    try {
      const es = new EventSource(sseUrl, { withCredentials: true });
      esRef.current = es;

      es.onopen = () => setConnected(true);
      es.onmessage = (e) => {
        try {
          const data: AuditEvent = JSON.parse(e.data);
          addEvent(data);
        } catch (err) {
          console.error('SSE parse error', err);
        }
      };
      es.onerror = () => {
        setConnected(false);
        es.close();
        startMock();
      };
    } catch {
      startMock();
    }

    return () => {
      esRef.current?.close();
      if (mockIntervalRef.current) clearInterval(mockIntervalRef.current);
    };
  }, [orderId, url, useMock, startMock]);

  return { events, connected };
}
