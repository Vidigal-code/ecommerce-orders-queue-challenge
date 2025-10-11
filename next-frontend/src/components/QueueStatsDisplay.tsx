'use client';

import React, { useEffect, useState } from 'react';
import { QueueStats } from '@/lib/types';

interface QueueStatsDisplayProps {
  stats: QueueStats | null;
  isConnected: boolean;
  lastUpdated: Date | null;
}

export function QueueStatsDisplay({ stats, isConnected, lastUpdated }: QueueStatsDisplayProps) {
  const [dataAge, setDataAge] = useState<string>('');
  
  // Update data age every second
  useEffect(() => {
    if (!lastUpdated) return;
    
    const interval = setInterval(() => {
      const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
      if (seconds < 60) {
        setDataAge(`${seconds}s ago`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setDataAge(`${minutes}m ${seconds % 60}s ago`);
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastUpdated]);

  // Calculate processing rates
  const processingRate = stats?.processedTotal && stats?.elapsedTimeSeconds
    ? Math.round(stats.processedTotal / stats.elapsedTimeSeconds * 10) / 10
    : 0;

  return (
    <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-300">Queue Statistics</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs text-neutral-400">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
          {lastUpdated && (
            <span className="text-xs text-neutral-500">{dataAge}</span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="p-3 bg-neutral-900 rounded border border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Processed</p>
          <p className="text-2xl font-semibold text-white">
            {stats?.processedTotal?.toLocaleString() || '0'}
            <span className="text-xs text-neutral-500 ml-1">orders</span>
          </p>
        </div>
        
        <div className="p-3 bg-neutral-900 rounded border border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Processing Rate</p>
          <p className="text-2xl font-semibold text-white">
            {processingRate}
            <span className="text-xs text-neutral-500 ml-1">orders/sec</span>
          </p>
        </div>
        
        <div className="p-3 bg-neutral-900 rounded border border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Waiting</p>
          <div className="flex items-end space-x-1">
            <p className="text-xl font-semibold text-white">
              {stats?.waiting?.toLocaleString() || '0'}
            </p>
            <div className="flex flex-col">
              <span className="text-xs text-blue-400">
                {stats?.waitingVip?.toLocaleString() || '0'} VIP
              </span>
              <span className="text-xs text-neutral-400">
                {stats?.waitingRegular?.toLocaleString() || '0'} Regular
              </span>
            </div>
          </div>
        </div>
        
        <div className="p-3 bg-neutral-900 rounded border border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Active Jobs</p>
          <div className="flex flex-col">
            <p className="text-xl font-semibold text-white">
              {stats?.active?.toLocaleString() || '0'}
            </p>
            <div className="flex justify-between text-xs">
              <span className="text-neutral-500">Workers</span>
              <span className="text-neutral-400">{stats?.workers || '0'}</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-4 p-3 bg-neutral-900 rounded border border-neutral-700">
        <div className="flex justify-between text-xs text-neutral-500 mb-2">
          <span>Throughput</span>
          <span>{processingRate} orders/sec</span>
        </div>
        <div className="h-1 bg-neutral-700 rounded overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400" 
            style={{ width: `${Math.min(100, processingRate / 10 * 100)}%` }} 
          />
        </div>
        <div className="flex justify-between text-xs text-neutral-500 mt-1">
          <span>0</span>
          <span>10+</span>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="p-3 bg-neutral-900 rounded border border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Completed</p>
          <p className="text-xl font-semibold text-green-400">
            {stats?.completed?.toLocaleString() || '0'}
          </p>
        </div>
        
        <div className="p-3 bg-neutral-900 rounded border border-neutral-700">
          <p className="text-xs text-neutral-500 mb-1">Failed</p>
          <p className="text-xl font-semibold text-red-400">
            {stats?.failed?.toLocaleString() || '0'}
          </p>
        </div>
      </div>
    </div>
  );
}