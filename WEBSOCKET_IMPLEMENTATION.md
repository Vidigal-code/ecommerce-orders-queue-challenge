# WebSocket Implementation Guide

This document provides an overview of the WebSocket implementation in the e-commerce orders processing system, explaining how real-time communication is established between the frontend and backend.

## Architecture Overview

The WebSocket implementation follows a provider-based architecture:

1. **Backend**: NestJS WebSocket Gateway using Socket.IO
2. **Frontend**: React Context Provider with Socket.IO client
3. **Data Flow**: Real-time status updates, logs, and progress information

## Backend Implementation (NestJS)

### Gateway Setup

The WebSocket gateway is implemented in `nest-backend/src/infrastructure/websocket/events.gateway.ts`:

```typescript
@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  // Connection handling and event methods
}
```

### Key Methods

- `handleConnection`: Tracks new client connections
- `handleDisconnect`: Handles client disconnections
- `emitStatus`: Broadcasts status updates to all clients
- `emitProgress`: Sends processing progress updates
- `emitLog`: Broadcasts log messages

### Module Registration

The gateway is registered in a dedicated module (`EventsModule`) and imported into the application module:

```typescript
// events.module.ts
@Module({
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}

// app.module.ts
@Module({
  imports: [
    // Other imports
    EventsModule,
  ],
  // Other configurations
})
export class AppModule {}
```

## Frontend Implementation (Next.js)

### WebSocket Provider

The WebSocket context provider is implemented in `next-frontend/src/hooks/useWebSocket.client.tsx`:

```typescript
const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<OrdersStatusDto | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Socket initialization and event handlers
  }, []);

  // Context value
  const value = useMemo<WebSocketContextValue>(/*...*/);

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}
```

### Hook Usage

Components access WebSocket data through the `useWebSocket` hook:

```typescript
export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
```

### Provider Integration

The provider is added at the root layout to make WebSocket available throughout the application:

```tsx
// app/layout.tsx
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>
          {/* Application content */}
          {children}
        </WebSocketProvider>
      </body>
    </html>
  );
}
```

## Data Exchange

### Event Types

1. **Status Updates**: Processing phase, counts, timing information
   ```typescript
   socket.on('status', (data: OrdersStatusDto) => {
     // Update state with new status
   });
   ```

2. **Logs**: Real-time log messages with timestamps and levels
   ```typescript
   socket.on('log', (logMessage: LogMessage) => {
     // Append new log message
   });
   ```

3. **Connection Events**: Connection status management
   ```typescript
   socket.on('connect', () => setIsConnected(true));
   socket.on('disconnect', () => setIsConnected(false));
   ```

## Fallback Mechanism

The system implements a REST API fallback for situations where WebSocket connectivity fails:

```typescript
// LogsViewer.tsx example
const { logs: wsLogs, isConnected } = useWebSocket();
const { data, mutate } = useSWR(['logs', lines], () => api.logs(lines), {
  refreshInterval: 12000, // Poll every 12 seconds as fallback
});

// Use WebSocket data if available, otherwise use polled data
const displayLogs = wsLogs.length > 0 ? wsLogs : convertPolledLogs(data?.logs);
```

## Testing WebSocket Components

Sample tests are included for both backend and frontend WebSocket implementations:

1. **Backend Gateway Tests** (`events.gateway.test.ts`):
   - Connection handling
   - Status and log emissions
   - Client request handling

2. **Frontend Provider Tests** (`useWebSocket.test.tsx`):
   - Initialization
   - Connection events
   - Status and log updates
   - Cleanup on unmount

## Improvement Areas

1. **Status Request Handler**: Update `handleGetStatus` to return actual data instead of an empty object
2. **Connection Recovery**: Add automatic reconnection logic with exponential backoff
3. **Authentication**: Add authentication to the WebSocket connection
4. **Performance**: Consider adding message batching for high-frequency updates

## Conclusion

The WebSocket implementation provides real-time updates for the e-commerce order processing system, ensuring users have up-to-date information on processing status, progress, and logs. The context-based provider architecture ensures a single WebSocket connection is maintained throughout the application lifecycle.