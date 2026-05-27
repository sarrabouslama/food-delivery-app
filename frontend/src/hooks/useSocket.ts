import { useEffect, useRef } from 'react';
import { getSocket } from '../lib/socket';
import type { Socket } from 'socket.io-client';

/**
 * Provides access to the socket.io client and lifecycle management.
 * Automatically cleans up event listeners on unmount.
 */
export function useSocket() {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = getSocket();
    return () => {
      socketRef.current = null;
    };
  }, []);

  const on = (event: string, handler: (...args: unknown[]) => void) => {
    const socket = getSocket();
    socket?.on(event, handler);
    return () => {
      socket?.off(event, handler);
    };
  };

  const emit = (event: string, data?: unknown) => {
    const socket = getSocket();
    socket?.emit(event, data);
  };

  return { socket: socketRef.current, on, emit };
}
