import { useState, useEffect, useRef } from 'react';
import type { AuditLog } from '../types';

/**
 * Connects to the SSE endpoint for an order's audit log stream.
 * Returns live audit events as they happen.
 */
export function useSSE(orderId: string | undefined) {
  const [events, setEvents] = useState<AuditLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const url = `/api/sse/orders/${orderId}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents(prev => {
          // Avoid duplicates
          const exists = prev.some(e => e.id === data.id);
          if (exists) return prev;
          return [...prev, data];
        });
      } catch (err) {
        console.error('[SSE] Parse error:', err);
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [orderId]);

  return { events, isConnected };
}
