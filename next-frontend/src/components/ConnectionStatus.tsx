'use client';

import React, { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface ConnectionStatusProps {
  showReconnect?: boolean;
  showStats?: boolean;
}

export function ConnectionStatus({ 
  showReconnect = true, 
  showStats = true 
}: ConnectionStatusProps) {
  const { isConnected, reconnect, connectionAttempts, lastActivity } = useWebSocket();
  const [dataAge, setDataAge] = useState<number>(0);
  const [lastConnected, setLastConnected] = useState<Date | null>(null);
  const [lastDisconnected, setLastDisconnected] = useState<Date | null>(null);
  
  // Track connection changes
  useEffect(() => {
    if (isConnected) {
      setLastConnected(new Date());
    } else if (lastConnected) {
      setLastDisconnected(new Date());
    }
  }, [isConnected]);
  
  // Update data age
  useEffect(() => {
    const interval = setInterval(() => {
      if (lastActivity) {
        setDataAge(Math.floor((Date.now() - lastActivity) / 1000));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastActivity]);
  
  return (
    <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-900/20' : 'bg-red-900/20'} border ${isConnected ? 'border-green-800' : 'border-red-800'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="ml-2 font-medium">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        
        {showReconnect && !isConnected && (
          <button
            onClick={() => reconnect()}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded transition"
          >
            Reconnect
          </button>
        )}
      </div>
      
      {showStats && (
        <div className="mt-2 grid grid-cols-1 gap-2 text-xs">
          {lastActivity && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Last activity:</span>
              <span>
                {dataAge < 60 ? `${dataAge}s ago` : `${Math.floor(dataAge / 60)}m ${dataAge % 60}s ago`}
              </span>
            </div>
          )}
          
          {connectionAttempts > 0 && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Reconnection attempts:</span>
              <span>{connectionAttempts}</span>
            </div>
          )}
          
          {lastConnected && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Last connected:</span>
              <span>{lastConnected.toLocaleTimeString()}</span>
            </div>
          )}
          
          {lastDisconnected && (
            <div className="flex justify-between">
              <span className="text-neutral-400">Last disconnected:</span>
              <span>{lastDisconnected.toLocaleTimeString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}