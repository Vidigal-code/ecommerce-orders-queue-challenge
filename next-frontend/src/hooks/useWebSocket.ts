import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface LogMessage {
  timestamp: number;
  level: 'log' | 'warn' | 'error';
  message: string;
  category?: string;
  data?: unknown;
}

export interface ProgressUpdate {
  phase: string;
  progress: number;
  total?: number;
  current?: number;
  message?: string;
  vipProcessed?: number;
  normalProcessed?: number;
  generationTime?: number;
  vipProcessingTime?: number;
  normalProcessingTime?: number;
  timestamp: number;
}

export interface StatusUpdate {
  phase: string;
  timestamp: number;
  message?: string;
  [key: string]: unknown;
}

export interface MetricsUpdate {
  timestamp: number;
  [key: string]: unknown;
}

interface WebSocketState {
  isConnected: boolean;
  lastMessage: unknown;
  logs: LogMessage[];
  progress: ProgressUpdate | null;
  status: StatusUpdate | null;
  metrics: MetricsUpdate | null;
}

export const useWebSocket = (backendUrl: string = 'http://localhost:3000') => {
  const socketRef = useRef<Socket | null>(null);
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    lastMessage: null,
    logs: [],
    progress: null,
    status: null,
    metrics: null,
  });

  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(backendUrl, {
      transports: ['websocket', 'polling'],
      upgrade: true,
      rememberUpgrade: true,
      timeout: 20000,
    });

    const socket = socketRef.current;

    socket.on('connect', () => {
      console.log('Connected to WebSocket server');
      setState(prev => ({ ...prev, isConnected: true }));
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from WebSocket server:', reason);
      setState(prev => ({ ...prev, isConnected: false }));
    });

    socket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
      setState(prev => ({ ...prev, lastMessage: data }));
    });

  socket.on('log', (logMessage: LogMessage) => {
      console.log('Received log:', logMessage);
      setState(prev => ({
        ...prev,
        logs: [...prev.logs.slice(-99), logMessage], // Keep last 100 logs
        lastMessage: logMessage,
      }));
    });

  socket.on('progress', (progressUpdate: ProgressUpdate) => {
      console.log('Received progress:', progressUpdate);
      setState(prev => ({
        ...prev,
        progress: progressUpdate,
        lastMessage: progressUpdate,
      }));
    });

  socket.on('status', (statusUpdate: StatusUpdate) => {
      console.log('Received status:', statusUpdate);
      setState(prev => ({
        ...prev,
        status: statusUpdate,
        lastMessage: statusUpdate,
      }));
    });

  socket.on('metrics', (metricsUpdate: MetricsUpdate) => {
      setState(prev => ({
        ...prev,
        metrics: metricsUpdate,
        lastMessage: metricsUpdate,
      }));
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      setState(prev => ({ ...prev, isConnected: false }));
    });

  }, [backendUrl]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setState(prev => ({ ...prev, isConnected: false }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    connect,
    disconnect,
  };
};