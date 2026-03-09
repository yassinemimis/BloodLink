import { useEffect, useRef, useState } from 'react';
import { io, Socket }                  from 'socket.io-client';
import { useAuthStore }                from '../store/useAuthStore';

export function useSocket() {
  const { user, isAuthenticated } = useAuthStore();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user) return;

    const socket = io('http://localhost:3000/ws', {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('register', { userId: user.id });
    });

    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;
    return () => { socket.disconnect(); socketRef.current = null; };
  }, [isAuthenticated, user?.id]);

  return { socket: socketRef.current, connected };
}