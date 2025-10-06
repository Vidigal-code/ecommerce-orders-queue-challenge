'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { OrdersStatusDto } from '@/lib/types';

export function useWebSocket() {
  const [status, setStatus] = useState<OrdersStatusDto | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://localhost:3000';

    console.log('Connecting to WebSocket at:', backendUrl);

    socketRef.current = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to WebSocket');
    });

    socket.on('disconnect', (reason: string) => {
      setIsConnected(false);
      console.log('Disconnected from WebSocket:', reason);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
    });

    socket.on('status', (data: OrdersStatusDto | unknown) => {
      console.log('Received status update:', data);

      // Check if data has the expected OrdersStatusDto structure
      if (data && typeof data === 'object' && 'processing' in data && 'counts' in data && 'phase' in data) {
        setStatus(data as OrdersStatusDto);
      } else {
        console.warn('Received status update with unexpected format, ignoring:', data);
      }
    });

    socket.on('progress', (data: unknown) => {
      console.log('Progress update:', data);
    });

    // Request initial status
    socket.emit('get-status');

    return () => {
      console.log('Cleaning up WebSocket connection');
      socket.disconnect();
    };
  }, []);

  return {
    status,
    isConnected,
    socket: socketRef.current,
  };
}