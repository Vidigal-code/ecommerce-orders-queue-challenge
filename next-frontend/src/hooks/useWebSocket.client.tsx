'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { OrdersStatusDto, type LogMessage } from '@/lib/types';

type WebSocketContextValue = {
  status: OrdersStatusDto | null;
  isConnected: boolean;
  logs: LogMessage[];
  socket: Socket | null;
};

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OrdersStatusDto | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:3000';

    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
    });

    socketRef.current = socket;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleConnectError = () => setIsConnected(false);
    const handleStatus = (data: OrdersStatusDto | unknown) => {
      if (
        data &&
        typeof data === 'object' &&
        'processing' in data &&
        'counts' in data &&
        'phase' in data
      ) {
        setStatus(data as OrdersStatusDto);
      }
    };

    const handleLog = (logMessage: LogMessage) => {
      setLogs((prevLogs: LogMessage[]) => [...prevLogs.slice(-99), logMessage]);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('status', handleStatus);
    socket.on('log', handleLog);

    socket.emit('get-status');

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('connect_error', handleConnectError);
      socket.off('status', handleStatus);
      socket.off('log', handleLog);
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const value = useMemo<WebSocketContextValue>(
    () => ({
      status,
      isConnected,
      logs,
      socket: socketRef.current,
    }),
    [status, isConnected, logs],
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
