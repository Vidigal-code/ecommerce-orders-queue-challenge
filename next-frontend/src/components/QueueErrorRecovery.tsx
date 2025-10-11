'use client';

import React from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function QueueErrorRecovery() {
  const { isConnected, reconnect, connectionAttempts } = useWebSocket();
  
  if (isConnected) return null;
  
  return (
    <div className="fixed bottom-4 right-4 p-4 rounded-lg bg-red-900/90 border border-red-800 shadow-lg max-w-xs z-50">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <h3 className="font-semibold">WebSocket Disconnected</h3>
        </div>
        
        <p className="text-sm text-neutral-300">
          Real-time updates are currently unavailable. 
          {connectionAttempts > 0 && (
            <span> Failed reconnection attempts: {connectionAttempts}</span>
          )}
        </p>
        
        <button 
          onClick={() => reconnect()}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
        >
          Reconnect Now
        </button>
      </div>
    </div>
  );
}