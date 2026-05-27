import { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../lib/socket';
import type { Notification } from '../types';

/**
 * Manages notifications via WebSocket.
 * Listens for new notifications and notification history on connect.
 */
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleNew = (notification: Notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    };

    const handleHistory = (history: Notification[]) => {
      setNotifications(prev => {
        const existingIds = new Set(prev.map(n => n.id));
        const newOnes = history.filter(n => !existingIds.has(n.id));
        return [...newOnes, ...prev];
      });
      const unread = history.filter(n => !n.isRead).length;
      setUnreadCount(prev => prev + unread);
    };

    socket.on('notification:new', handleNew);
    socket.on('notifications:history', handleHistory);

    return () => {
      socket.off('notification:new', handleNew);
      socket.off('notifications:history', handleHistory);
    };
  }, []);

  const markAllRead = useCallback(() => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, markAllRead, clearAll };
}
