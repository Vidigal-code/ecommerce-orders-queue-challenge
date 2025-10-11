'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { io, type Socket } from 'socket.io-client';
import { OrdersStatusDto, type LogMessage } from '@/lib/types';

type PartialDeep<T> = {
  [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K];
};

type ProgressUpdate = PartialDeep<OrdersStatusDto> & {
  // Allow common flat shapes too
  processedTotal?: number;
  generated?: number;
  target?: number;
  progressPercent?: number;
  phase?: OrdersStatusDto['phase'];
};

type WebSocketContextValue = {
  status: OrdersStatusDto | null;
  isConnected: boolean;
  logs: LogMessage[];
  socket: Socket | null;
  connectionAttempts: number;
  lastActivity: number | null;
  clearLogs: () => void;
  reconnect: () => void;
};

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

const MAX_LOGS = 300;
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OrdersStatusDto | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [lastActivity, setLastActivity] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and manage the WebSocket connection
  const initializeSocket = useCallback(() => {
    if (socketRef.current) {
      console.log('Socket already exists, disconnecting first');
      socketRef.current.disconnect();
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_BASE_URL ?? 'http://localhost:3000';
    console.log(`Connecting to WebSocket at ${backendUrl}, attempt ${connectionAttempts + 1}`);

    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true, // Create a new connection each time
      autoConnect: true, // Connect automatically
      withCredentials: true, // Allow credentials in CORS
      extraHeaders: {
        'X-Client': 'Next.js WebSocket Client',
      },
    });

    socketRef.current = socket;

    const handleConnect = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setConnectionAttempts(0);
      setLastActivity(Date.now());
      
      // Request initial status
      socket.emit('get-status');
    };
    
    const handleDisconnect = (reason: string) => {
      console.log(`WebSocket disconnected: ${reason}`);
      setIsConnected(false);
      
      // If not manually disconnected, attempt reconnection
      if (reason !== 'io client disconnect') {
        handleReconnect();
      }
    };
    
    const handleConnectError = (error: Error) => {
      console.log(`WebSocket connection error: ${error.message}`);
      setIsConnected(false);
      handleReconnect();
    };
    
    const handleStatus = (data: OrdersStatusDto | unknown) => {
      if (
        data &&
        typeof data === 'object' &&
        'processing' in data &&
        'counts' in data &&
        'phase' in data
      ) {
        setStatus(data as OrdersStatusDto);
        setLastActivity(Date.now());
      }
    };

    const handleLog = (logMessage: LogMessage) => {
      setLogs((prevLogs: LogMessage[]) => {
        const newLogs = [...prevLogs, logMessage];
        // Keep only the latest MAX_LOGS entries
        return newLogs.slice(-MAX_LOGS);
      });
      setLastActivity(Date.now());
    };

    const handleProgress = (data: ProgressUpdate) => {
      // Update last activity timestamp when any data is received
      setLastActivity(Date.now());

      // Merge progress-like payloads into current status, if present
      setStatus((prev: OrdersStatusDto | null) => {
        if (!prev) return prev; // No baseline to merge into yet

        const next: OrdersStatusDto = { ...prev };

        // Merge nested progress
        if (data.progress) {
          next.progress = { ...prev.progress, ...data.progress } as OrdersStatusDto['progress'];
        }
        // Support flat values
        if (typeof data.processedTotal === 'number') {
          next.progress = { ...next.progress, processedTotal: data.processedTotal };
        }
        if (typeof data.generated === 'number') {
          next.progress = { ...next.progress, generated: data.generated };
        }
        if (typeof data.target === 'number') {
          next.progress = { ...next.progress, target: data.target };
        }

        // Merge ETA
        if (data.eta) {
          next.eta = { ...prev.eta, ...data.eta } as OrdersStatusDto['eta'];
        }
        if (typeof data.progressPercent === 'number') {
          next.eta = { ...next.eta, progressPercent: data.progressPercent } as OrdersStatusDto['eta'];
        }

        // Merge throughput
        if (data.throughput) {
          next.throughput = { ...prev.throughput, ...data.throughput } as OrdersStatusDto['throughput'];
        }

        // Merge counts
        if (data.counts) {
          next.counts = { ...prev.counts, ...data.counts } as OrdersStatusDto['counts'];
        }

        // Merge processing windows if provided
        if (data.processing) {
          next.processing = {
            vip: { ...prev.processing.vip, ...(data.processing.vip || {}) },
            normal: { ...prev.processing.normal, ...(data.processing.normal || {}) },
          } as OrdersStatusDto['processing'];
        }

        // Merge durations if present
        if (typeof (data as any).generationTimeMs === 'number') {
          next.generationTimeMs = (data as any).generationTimeMs as number;
        }
        if (typeof (data as any).enqueueVipTimeMs === 'number') {
          next.enqueueVipTimeMs = (data as any).enqueueVipTimeMs as number;
        }
        if (typeof (data as any).enqueueNormalTimeMs === 'number') {
          next.enqueueNormalTimeMs = (data as any).enqueueNormalTimeMs as number;
        }
        if (typeof (data as any).totalTimeMs === 'number') {
          next.totalTimeMs = (data as any).totalTimeMs as number;
        }

        // Merge phase if provided
        if (data.phase) {
          next.phase = data.phase;
        }

        return next;
      });
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('connect_error', handleConnectError);
    socket.on('status', handleStatus);
    socket.on('log', handleLog);
    socket.on('progress', handleProgress);

    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('connect_error', handleConnectError);
        socket.off('status', handleStatus);
        socket.off('log', handleLog);
        socket.off('progress', handleProgress);
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [connectionAttempts]);

  // Handle reconnection logic with exponential backoff
  const handleReconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }

    if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
      setConnectionAttempts((prev: number) => prev + 1);
      
      // Calculate backoff time with jitter to prevent thundering herd
      const baseDelay = RECONNECT_DELAY_MS * Math.pow(1.5, connectionAttempts);
      const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
      const reconnectDelay = Math.min(baseDelay + jitter, 30000); // Cap at 30 seconds
      
      // Add a reconnection message to logs
      setLogs((prevLogs: LogMessage[]) => [
        ...prevLogs,
        {
          timestamp: Date.now(),
          level: 'warn',
          message: `WebSocket disconnected. Reconnecting in ${Math.round(reconnectDelay/1000)}s (attempt ${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`,
          category: 'connection',
        },
      ]);
      
      reconnectTimerRef.current = setTimeout(() => {
        initializeSocket();
      }, reconnectDelay);
    } else {
      setLogs((prevLogs: LogMessage[]) => [
        ...prevLogs,
        {
          timestamp: Date.now(),
          level: 'error',
          message: `Failed to reconnect after ${MAX_RECONNECT_ATTEMPTS} attempts. Please use the reconnect button or refresh the page.`,
          category: 'connection',
        },
      ]);
      
      // After a cool-down period, try one more time automatically
      reconnectTimerRef.current = setTimeout(() => {
        setConnectionAttempts(0); // Reset attempts counter
        setLogs((prevLogs: LogMessage[]) => [
          ...prevLogs,
          {
            timestamp: Date.now(),
            level: 'log',
            message: `Attempting automatic reconnection after cool-down period...`,
            category: 'connection',
          },
        ]);
        initializeSocket();
      }, 60000); // Wait 1 minute before trying again
    }
  }, [connectionAttempts, initializeSocket]);

  // Manual reconnection function
  const reconnect = useCallback(() => {
    setConnectionAttempts(0);
    initializeSocket();
  }, [initializeSocket]);

  // Clear logs function
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Initialize WebSocket on component mount
  useEffect(() => {
    const cleanup = initializeSocket();
    
    // Set up a heartbeat to check connection health
    const heartbeatInterval = setInterval(() => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit('get-status');
      }
    }, 30000); // Check every 30 seconds

    return () => {
      cleanup();
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      clearInterval(heartbeatInterval);
    };
  }, [initializeSocket]);

  // Create memoized context value
  const value = useMemo<WebSocketContextValue>(
    () => ({
      status,
      isConnected,
      logs,
      socket: socketRef.current,
      connectionAttempts,
      lastActivity,
      clearLogs,
      reconnect,
    }),
    [status, isConnected, logs, connectionAttempts, lastActivity, clearLogs, reconnect],
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
