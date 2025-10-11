# Testing the WebSocket Provider

This document explains how to test the WebSocket provider implementation in the e-commerce orders processing system. The tests verify that the WebSocket provider correctly handles connections, status updates, logs, and cleanup.

## Setting Up the Testing Environment

To test the WebSocket provider, you'll need to install the following dependencies:

```bash
# For Next.js/React components
npm install --save-dev @testing-library/react @testing-library/react-hooks

# For test runner
npm install --save-dev jest @types/jest
```

## Test Scenarios

### 1. Initialization Test

This test verifies that the WebSocket provider initializes with the correct default values:

```typescript
test('initializes with default values', async () => {
  const wrapper = ({ children }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  );

  const { result } = renderHook(() => useWebSocket(), { wrapper });

  expect(result.current).toEqual({
    status: null,
    isConnected: false,
    logs: [],
    socket: null
  });
});
```

### 2. Connection Event Test

This test verifies that the WebSocket provider correctly handles connection and disconnection events:

```typescript
test('handles socket connection events', async () => {
  const io = require('socket.io-client').io;
  const mockSocket = io();
  
  const wrapper = ({ children }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  );

  const { result } = renderHook(() => useWebSocket(), { wrapper });

  // Simulate connect event
  act(() => {
    const connectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'connect')[1];
    connectHandler();
  });

  await waitFor(() => {
    expect(result.current.isConnected).toBe(true);
  });

  // Simulate disconnect event
  act(() => {
    const disconnectHandler = mockSocket.on.mock.calls.find(call => call[0] === 'disconnect')[1];
    disconnectHandler();
  });

  await waitFor(() => {
    expect(result.current.isConnected).toBe(false);
  });
});
```

### 3. Status Update Test

This test verifies that the WebSocket provider correctly handles status updates:

```typescript
test('handles status updates', async () => {
  const io = require('socket.io-client').io;
  const mockSocket = io();
  
  const wrapper = ({ children }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  );

  const { result } = renderHook(() => useWebSocket(), { wrapper });

  // Create mock status data
  const mockStatus = {
    phase: 'GENERATING',
    counts: { vip: 100, normal: 200 },
    // Other status fields
  };

  // Simulate status event
  act(() => {
    const statusHandler = mockSocket.on.mock.calls.find(call => call[0] === 'status')[1];
    statusHandler(mockStatus);
  });

  await waitFor(() => {
    expect(result.current.status).toEqual(mockStatus);
  });
});
```

### 4. Log Message Test

This test verifies that the WebSocket provider correctly handles log messages:

```typescript
test('handles log messages', async () => {
  const io = require('socket.io-client').io;
  const mockSocket = io();
  
  const wrapper = ({ children }) => (
    <WebSocketProvider>{children}</WebSocketProvider>
  );

  const { result } = renderHook(() => useWebSocket(), { wrapper });

  // Create mock log message
  const mockLog = {
    timestamp: Date.now(),
    level: 'log',
    message: 'Test log message',
    category: 'test'
  };

  // Simulate log event
  act(() => {
    const logHandler = mockSocket.on.mock.calls.find(call => call[0] === 'log')[1];
    logHandler(mockLog);
  });

  await waitFor(() => {
    expect(result.current.logs).toEqual([mockLog]);
  });
});
```

### 5. Cleanup Test

This test verifies that the WebSocket provider properly cleans up the socket connection when unmounted:

```typescript
test('cleans up socket connection on unmount', () => {
  const io = require('socket.io-client').io;
  const mockSocket = io();
  
  const { unmount } = render(
    <WebSocketProvider>
      <div>Test</div>
    </WebSocketProvider>
  );

  unmount();

  expect(mockSocket.disconnect).toHaveBeenCalled();
});
```

## Running the Tests

To run the tests, use the following command:

```bash
npx jest src/hooks/useWebSocket.test.tsx
```

## Mock Setup

Before the tests, you need to mock the socket.io-client module:

```typescript
jest.mock('socket.io-client', () => {
  const mockSocketOn = jest.fn();
  const mockSocketOff = jest.fn();
  const mockSocketEmit = jest.fn();
  const mockSocketDisconnect = jest.fn();
  
  const mockIo = jest.fn(() => ({
    on: mockSocketOn,
    off: mockSocketOff,
    emit: mockSocketEmit,
    disconnect: mockSocketDisconnect
  }));

  return {
    io: mockIo
  };
});
```

## Additional Test Cases

Consider adding the following test cases:

1. **Reconnection Test**: Verify that the WebSocket reconnects when connection is lost
2. **Error Handling Test**: Verify that the WebSocket provider handles connection errors gracefully
3. **Performance Test**: Verify that the WebSocket provider can handle high volumes of messages

## Best Practices

1. **Clear Mocks**: Use `jest.clearAllMocks()` in `beforeEach` to reset mock state
2. **Wait for Updates**: Use `waitFor` to wait for async state updates
3. **Isolate Tests**: Each test should be independent and not rely on previous test state
4. **Realistic Payloads**: Use realistic data structures in your tests