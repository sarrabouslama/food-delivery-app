import { io, type Socket } from 'socket.io-client';

let _socket: Socket | null = null;
let _token: string | null = null;

export function getSocket(): Socket | null {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  if (_socket && _token === token && (_socket.connected || _socket.active)) {
    return _socket;
  }

  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
  }

  const url = (import.meta.env.VITE_WS_URL as string | undefined) ?? 'http://localhost:3000';
  _token = token;
  _socket = io(url, {
    query: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 8,
    reconnectionDelay: 3000,
  });
  return _socket;
}

export function disconnectSocket() {
  if (_socket) {
    _socket.removeAllListeners();
    _socket.disconnect();
    _socket = null;
    _token = null;
  }
}
