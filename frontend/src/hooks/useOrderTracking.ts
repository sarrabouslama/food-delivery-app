import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import type { OrderStatus, WsOrderStatusUpdated } from '../types';

/**
 * Subscribes to real-time order status updates via WebSocket.
 * Joins the order room and listens for status changes.
 */
export function useOrderTracking(orderId: string | undefined) {
  const [liveStatus, setLiveStatus] = useState<OrderStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<WsOrderStatusUpdated | null>(null);

  useEffect(() => {
    if (!orderId) return;

    const socket = getSocket();
    if (!socket?.connected) return;

    // Subscribe to order room
    socket.emit('order:subscribe', { orderId });

    const handleStatusUpdate = (data: WsOrderStatusUpdated) => {
      if (data.orderId === orderId) {
        setLiveStatus(data.toStatus);
        setLastUpdate(data);
      }
    };

    socket.on('order:status_updated', handleStatusUpdate);

    return () => {
      socket.off('order:status_updated', handleStatusUpdate);
      socket.emit('order:unsubscribe', { orderId });
    };
  }, [orderId]);

  const resetTracking = useCallback(() => {
    setLiveStatus(null);
    setLastUpdate(null);
  }, []);

  return { liveStatus, lastUpdate, resetTracking };
}
