import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { getSocket, disconnectSocket } from '../lib/socket';
import { getNotificationHistory } from '../services/graphql';
import type { WsNotification } from '../hooks/useWebSocket';

interface NotificationState {
  notifications: WsNotification[];
  unreadCount: number;
  markAllRead: () => void;
}

const NotificationContext = createContext<NotificationState>({
  notifications: [],
  unreadCount: 0,
  markAllRead: () => {},
});

export const useNotifications = () => useContext(NotificationContext);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [notifications, setNotifications] = useState<WsNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const addToastRef = useRef(addToast);
  useEffect(() => { addToastRef.current = addToast; }, [addToast]);

  // Load notification history via REST on mount so historical data is always available
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    getNotificationHistory(20).then(history => {
      if (history.length > 0) {
        setNotifications(history);
        setUnreadCount(history.length);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) {
      disconnectSocket();
      return;
    }

    const socket = getSocket();
    if (!socket) return;

    const handleNotification = (n: WsNotification) => {
      setNotifications(prev => {
        if (prev.some(p => p.id === n.id)) return prev;
        return [n, ...prev].slice(0, 50);
      });
      setUnreadCount(c => c + 1);
      addToastRef.current(
        n.type === 'PAYMENT' ? 'success' : 'info',
        n.title,
        n.message,
      );
    };

    const handleHistory = (history: WsNotification[]) => {
      setNotifications(prev => {
        const seen = new Set(prev.map(p => p.id));
        const merged = [...prev, ...history.filter(n => !seen.has(n.id))];
        return merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 50);
      });
    };

    socket.on('notification:new', handleNotification);
    socket.on('notifications:history', handleHistory);

    return () => {
      socket.off('notification:new', handleNotification);
      socket.off('notifications:history', handleHistory);
    };
  }, [user]);

  const markAllRead = () => setUnreadCount(0);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
};
