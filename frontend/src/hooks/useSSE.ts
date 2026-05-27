import { useEffect, useRef, useState, useCallback } from 'react';

export interface AuditEvent {
  id: string;
  orderId: string;
  eventType: string;
  fromStatus: string | null;
  toStatus: string;
  triggeredBy: string;
  timestamp: string;
}

const EVENT_META: Record<string, { label: string; role: 'customer' | 'restaurant' | 'system' | 'driver' }> = {
  ORDER_CREATED:          { label: 'Order Placed',        role: 'customer' },
  ORDER_CONFIRMED:        { label: 'Order Confirmed',     role: 'restaurant' },
  ORDER_PREPARING:        { label: 'Preparing',           role: 'restaurant' },
  ORDER_READY:            { label: 'Ready for Pickup',    role: 'restaurant' },
  ORDER_OUT_FOR_DELIVERY: { label: 'Out for Delivery',    role: 'driver' },
  ORDER_DELIVERED:        { label: 'Delivered',           role: 'driver' },
  ORDER_CANCELLED:        { label: 'Order Cancelled',     role: 'system' },
  PAYMENT_RECEIVED:       { label: 'Payment Confirmed',   role: 'system' },
  PAYMENT_FAILED:         { label: 'Payment Failed',      role: 'system' },
};

export function getEventMeta(eventType: string) {
  return EVENT_META[eventType] ?? {
    label: eventType.replace(/_/g, ' '),
    role: 'system' as const,
  };
}

// Uses fetch() instead of EventSource so we can send Authorization header
export function useSSE({ orderId }: { orderId?: string }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const addEvent = useCallback((ev: AuditEvent) => {
    setEvents(prev => {
      if (prev.some(e => e.id === ev.id)) return prev;
      return [ev, ...prev];
    });
  }, []);

  useEffect(() => {
    if (!orderId) return;

    const token = localStorage.getItem('access_token');
    const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000/api';
    const url = `${apiUrl}/sse/orders/${orderId}`;

    const controller = new AbortController();
    abortRef.current = controller;

    (async () => {
      try {
        const res = await fetch(url, {
          signal: controller.signal,
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (!res.ok || !res.body) return;
        setConnected(true);

        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = '';

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const raw = JSON.parse(line.slice(6));
              // NestJS SSE wraps payload as { data: eventPayload }
              const p: Record<string, unknown> = (raw.data as Record<string, unknown>) ?? raw;
              if (!p?.eventType) continue;
              addEvent({
                id: `${String(p.eventType)}-${String(p.timestamp ?? Date.now())}`,
                orderId: (p.orderId as string) ?? orderId,
                eventType: p.eventType as string,
                fromStatus: (p.fromStatus as string | null) ?? null,
                toStatus: (p.toStatus as string) ?? '',
                triggeredBy: (p.triggeredBy as string) ?? 'system',
                timestamp: (p.timestamp as string) ?? new Date().toISOString(),
              });
            } catch { /* ignore malformed lines */ }
          }
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') setConnected(false);
      } finally {
        setConnected(false);
      }
    })();

    return () => { controller.abort(); };
  }, [orderId, addEvent]);

  return { events, connected };
}
