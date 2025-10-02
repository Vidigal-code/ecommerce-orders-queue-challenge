"use client";
import { useState } from 'react';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

interface EndpointItem {
  label: string;
  path: string;
  method: string;
  action?: () => Promise<unknown>;
  description?: string;
}

export function EndpointsPanel() {
  const { isConnected } = useWebSocket();
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1000000);

  const endpoints: EndpointItem[] = [
    { label: 'GET /orders (v2)', path: '/orders', method: 'GET', action: () => api.ordersV2(), description: 'Unified status (contract v2)' },
    { label: 'GET /pedidos', path: '/pedidos', method: 'GET', action: () => api.status(), description: 'Status summary' },
    { label: 'POST /pedidos/generate', path: '/pedidos/generate', method: 'POST', action: () => api.generate(quantity), description: 'Start generation' },
    { label: 'POST /pedidos/cancel', path: '/pedidos/cancel', method: 'POST', action: () => api.cancel(), description: 'Abort & purge current run' },
    { label: 'POST /pedidos/reset', path: '/pedidos/reset', method: 'POST', action: () => api.reset(), description: 'Full system reset' },
    { label: 'GET /pedidos/logs', path: '/pedidos/logs', method: 'GET', action: () => api.logs(100), description: 'Recent logs' },
    { label: 'GET /pedidos/health/queue', path: '/pedidos/health/queue', method: 'GET', action: () => api.health(), description: 'Queue health' },
    { label: 'GET /pedidos/queue/status', path: '/pedidos/queue/status', method: 'GET', action: () => api.queueStatus(), description: 'Queue counts' },
  ];

  async function invoke(ep: EndpointItem) {
    if (!ep.action) return;
    setLoading(ep.label);
    setError(null);
    setResult(null);
    try {
      const res = await ep.action();
      setResult({ endpoint: ep.label, data: res });
    } catch (e) {
      setError((e as Error).message || 'Request failed');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-700 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="font-semibold">Backend Endpoints</h3>
        <span className={`text-xs px-2 py-1 rounded border ${isConnected ? 'border-green-600 text-green-400' : 'border-red-600 text-red-400'}`}>{isConnected ? 'WS Connected' : 'WS Disconnected'}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <label className="flex items-center gap-1">Quantity:
            <input type="number" value={quantity} min={1} onChange={e => setQuantity(parseInt(e.target.value, 10))} className="bg-neutral-800 w-32 px-2 py-1 rounded border border-neutral-700" />
          </label>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {endpoints.map(ep => (
            <button
              key={ep.label}
              disabled={!!loading}
              onClick={() => invoke(ep)}
              className="text-left p-3 rounded bg-neutral-800 border border-neutral-700 hover:border-neutral-500 transition disabled:opacity-50"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs bg-neutral-700 px-1 rounded">{ep.method}</span>
                <span className="text-[10px] text-neutral-400">{ep.path}</span>
              </div>
              <div className="text-sm mt-1 font-medium">{ep.label}</div>
              {ep.description && <div className="text-[11px] text-neutral-400 mt-1">{ep.description}</div>}
            </button>
          ))}
        </div>
      </div>
      {loading && <p className="text-xs text-blue-400">Calling {loading}...</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && (
        <pre className="max-h-60 overflow-auto text-[10px] bg-neutral-800 p-2 rounded border border-neutral-700">
{JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
