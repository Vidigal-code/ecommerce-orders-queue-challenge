'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { LogMessage } from '@/lib/types';

interface RealTimeLogsProps {
  maxLogs?: number;
  filterLevel?: 'log' | 'warn' | 'error' | null;
  title?: string;
  autoScroll?: boolean;
}

export function RealTimeLogs({
  maxLogs = 100,
  filterLevel = null,
  title = 'Real-time Logs',
  autoScroll = true
}: RealTimeLogsProps) {
  const { logs, isConnected, lastActivity } = useWebSocket();
  const [dataAge, setDataAge] = useState<string>('');
  const logEndRef = React.useRef<HTMLDivElement>(null);
  
  // Filter logs based on level if specified
  const filteredLogs = useMemo(() => {
    let filtered = [...logs];
    if (filterLevel) {
      filtered = filtered.filter(log => log.level === filterLevel);
    }
    // Return only the latest logs based on maxLogs
    return filtered.slice(-maxLogs);
  }, [logs, filterLevel, maxLogs]);

  // Update data age
  useEffect(() => {
    if (!lastActivity) return;
    
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastActivity) / 1000);
      if (seconds < 60) {
        setDataAge(`${seconds}s ago`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setDataAge(`${minutes}m ${seconds % 60}s ago`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastActivity]);

  // Auto-scroll to the bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const getLogLevelClass = (level: string): string => {
    switch (level) {
      case 'error':
        return 'text-red-500';
      case 'warn':
        return 'text-yellow-500';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-300">{title}</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-neutral-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
          {lastActivity && (
            <span className="text-xs text-neutral-500">{dataAge}</span>
          )}
        </div>
      </div>
      
      <div className="h-64 overflow-y-auto bg-neutral-900 rounded border border-neutral-700 p-2">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-neutral-500 text-sm">No logs available</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <div key={`${log.timestamp}-${index}`} className="text-xs font-mono">
                <span className="text-neutral-500">[{new Date(log.timestamp).toLocaleTimeString()}] </span>
                <span className={getLogLevelClass(log.level)}>{log.level.toUpperCase()}</span>
                {log.category && <span className="text-neutral-400"> [{log.category}]</span>}
                <span className="text-neutral-300">: {log.message}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-neutral-500">
          Showing {filteredLogs.length} of {logs.length} logs
          {filterLevel && ` (filtered: ${filterLevel})`}
        </div>
      </div>
    </div>
  );
}