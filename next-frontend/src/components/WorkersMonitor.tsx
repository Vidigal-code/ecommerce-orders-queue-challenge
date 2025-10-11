'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface WorkerInfo {
  id: number;
  status: 'idle' | 'active' | 'failed';
  processing?: {
    orderId?: string;
    orderType?: 'VIP' | 'NORMAL';
    startedAt?: number;
  };
}

export function WorkersMonitor() {
  const { status, isConnected } = useWebSocket();
  const [workers, setWorkers] = useState<WorkerInfo[]>([]);
  
  // Simulate worker statuses based on the current process state
  useEffect(() => {
    if (!status) {
      setWorkers([]);
      return;
    }
    
    // Simulate 10 workers with statuses based on current phase
    const workerCount = 10;
    const newWorkers: WorkerInfo[] = [];
    
    for (let i = 0; i < workerCount; i++) {
      // Determine worker status based on current phase
      let workerStatus: WorkerInfo['status'] = 'idle';
      let processing: WorkerInfo['processing'] = undefined;
      
      // Workers are active if there's processing going on
      if (['WAITING_VIP_DRAIN', 'WAITING_NORMAL_DRAIN'].includes(status.phase)) {
        const isVipPhase = status.phase === 'WAITING_VIP_DRAIN';
        const isActiveWorker = i < Math.min(workerCount, status.progress.processedTotal > 0 ? 8 : 0);
        
        if (isActiveWorker) {
          workerStatus = 'active';
          processing = {
            orderId: `order-${Math.floor(Math.random() * 1000000)}`,
            orderType: isVipPhase ? 'VIP' : 'NORMAL',
            startedAt: Date.now() - Math.floor(Math.random() * 5000)
          };
        }
      }
      
      // Randomly make one worker failed if in an error state
      if (status.phase === 'ERROR' && i === 0) {
        workerStatus = 'failed';
      }
      
      newWorkers.push({
        id: i + 1,
        status: workerStatus,
        processing
      });
    }
    
    setWorkers(newWorkers);
  }, [status]);
  
  // Calculate some stats
  const stats = useMemo(() => {
    const active = workers.filter(w => w.status === 'active').length;
    const idle = workers.filter(w => w.status === 'idle').length;
    const failed = workers.filter(w => w.status === 'failed').length;
    
    return { active, idle, failed, total: workers.length };
  }, [workers]);
  
  return (
    <div className="p-4 rounded-lg bg-neutral-800 border border-neutral-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-300">Workers Status</h3>
        <div className="text-xs bg-neutral-900 rounded-full px-3 py-1">
          <span className="text-green-400">{stats.active} active</span>
          <span className="mx-1 text-neutral-500">|</span>
          <span className="text-neutral-400">{stats.idle} idle</span>
          {stats.failed > 0 && (
            <>
              <span className="mx-1 text-neutral-500">|</span>
              <span className="text-red-400">{stats.failed} failed</span>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-2">
        {workers.map((worker) => (
          <div 
            key={worker.id}
            className={`p-2 rounded border ${
              worker.status === 'active' ? 'bg-blue-900/20 border-blue-800' : 
              worker.status === 'failed' ? 'bg-red-900/20 border-red-800' : 
              'bg-neutral-900 border-neutral-700'
            }`}
          >
            <div className="flex items-center mb-1">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                worker.status === 'active' ? 'bg-blue-500 animate-pulse' : 
                worker.status === 'failed' ? 'bg-red-500' : 
                'bg-neutral-500'
              }`} />
              <span className="text-xs font-medium">Worker {worker.id}</span>
            </div>
            
            <div className="text-[10px] text-neutral-400">
              {worker.status === 'active' && worker.processing && (
                <>
                  <div className="truncate">
                    {worker.processing.orderType === 'VIP' ? 
                      <span className="text-yellow-500">VIP</span> : 
                      <span className="text-blue-400">NORMAL</span>
                    }
                  </div>
                  <div className="truncate">{worker.processing.orderId}</div>
                </>
              )}
              {worker.status === 'failed' && <span className="text-red-400">Error</span>}
              {worker.status === 'idle' && <span>Waiting</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}