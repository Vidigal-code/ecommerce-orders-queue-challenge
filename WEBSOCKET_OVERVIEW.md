# WebSocket Communication Layer

## Overview

The WebSocket communication layer is a critical component of our e-commerce order processing system, providing real-time updates between the NestJS backend and Next.js frontend. This bidirectional communication channel ensures that users receive immediate updates about order processing status, logs, and progress without requiring constant API polling.

## Key Features

### 1. Real-Time Status Updates
- Processing phase changes (GENERATING, ENQUEUE_VIP, etc.)
- Order counts (VIP vs. normal)
- Timing metrics for each processing phase
- Throughput statistics
- ETA and progress percentage

### 2. Live Log Streaming
- System logs sent directly to the frontend
- Categorized by level (log, warn, error)
- Timestamp information
- Category tagging for better organization

### 3. Connection Management
- Connection status tracking
- Automatic reconnection attempts
- Fallback to REST API when WebSocket is unavailable

## Architecture

### Backend (NestJS)
- Socket.IO server implementation using `@nestjs/websockets`
- Events Gateway with `@WebSocketGateway` decorator
- Client connection/disconnection tracking
- Broadcast methods for status, logs, and progress

### Frontend (Next.js)
- Socket.IO client wrapped in React Context Provider
- Custom hook `useWebSocket()` for accessing socket data
- Connection state management
- Message handlers for different event types

## Data Flow

1. **Server → Client**
   - Status updates: Current phase, counts, timing
   - Log messages: System events, errors, warnings
   - Progress notifications: Percentage completion, ETA

2. **Client → Server**
   - Status requests: Client requests current processing status
   - (Future) Control commands: Pause/resume processing

## Fallback Mechanism

To ensure system resilience, a REST API fallback is implemented:

- If WebSocket connection fails, frontend falls back to polling
- SWR used for efficient data fetching with caching
- Automatic switch back to WebSocket when connection is restored

## Implementation Details

### Socket Initialization (Frontend)
```typescript
useEffect(() => {
  const socket = io(backendUrl, {
    transports: ['websocket', 'polling'],
    timeout: 5000,
  });
  
  // Event handlers and cleanup
}, []);
```

### Status Event Handling (Frontend)
```typescript
socket.on('status', (data: OrdersStatusDto | unknown) => {
  if (data && typeof data === 'object' && 'phase' in data) {
    setStatus(data as OrdersStatusDto);
  }
});
```

### Status Emission (Backend)
```typescript
async emitStatus(update?: Partial<StatusUpdate> | OrdersStatusDto) {
  if (this.server) {
    this.server.emit('status', update || {});
  }
}
```

## Future Improvements

1. **Enhanced Authentication**: Secure socket connections with token-based auth
2. **Connection Recovery**: Implement exponential backoff for reconnection attempts
3. **Message Batching**: Group frequent updates to reduce network overhead
4. **Event Filtering**: Allow clients to subscribe to specific event types
5. **State Persistence**: Cache last status update for immediate delivery on reconnection

## Conclusion

The WebSocket communication layer provides a robust real-time connection between frontend and backend, ensuring that users always have the most up-to-date information about order processing. This bidirectional channel enhances the user experience by eliminating the need for constant page refreshes or API polling.