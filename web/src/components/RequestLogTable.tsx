import React from 'react';
import { RequestRecord } from '../types';
import { Activity, ArrowUpRight, Zap, AlertTriangle } from 'lucide-react';

interface RequestLogTableProps {
  requests: RequestRecord[];
}

export const RequestLogTable: React.FC<RequestLogTableProps> = ({ requests }) => {
  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Activity size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Real-Time Inference Interception Stream</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Live Wire-Speed Telemetry</p>
          </div>
        </div>
        <span className="text-xs text-[#94a3b8] font-mono">
          {requests.length} Latest Requests
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="bg-[#0d121d] p-8 rounded-lg text-center text-sm text-[#64748b]">
          Awaiting incoming proxy traffic. Direct your LLM client or agent harness to <code className="text-[#3b82f6]">http://localhost:8585</code> to see requests live.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[720px]">
            <thead>
              <tr className="border-b border-[#1e2638] text-[#94a3b8] font-mono">
                <th className="pb-2.5 font-medium whitespace-nowrap">Timestamp</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Model</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Status</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Prefix Hash</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Cached Read</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Uncached</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">TTFT</th>
                <th className="pb-2.5 font-medium text-right whitespace-nowrap">Saved USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638]/60 font-mono">
              {requests.map((r) => {
                const isHit = r.cache_read_tokens > 0;
                return (
                  <tr key={r.id} className="hover:bg-[#141b2a]/50 transition">
                    <td className="py-2.5 text-[#64748b] whitespace-nowrap">
                      {new Date(r.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 text-[#f1f5f9] font-sans font-medium whitespace-nowrap">
                      {r.model}
                    </td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-sans font-medium whitespace-nowrap ${
                          isHit
                            ? 'bg-[#10b981]/15 text-[#10b981]'
                            : 'bg-[#f59e0b]/15 text-[#f59e0b]'
                        }`}
                      >
                        {isHit ? <Zap size={10} /> : <AlertTriangle size={10} />}
                        {isHit ? 'Cache Hit' : 'Cache Write'}
                      </span>
                    </td>
                    <td className="py-2.5 text-[#06b6d4] whitespace-nowrap">
                      {r.prefix_hash ? r.prefix_hash.slice(0, 8) : '-'}
                    </td>
                    <td className="py-2.5 text-[#10b981] font-semibold whitespace-nowrap">
                      {r.cache_read_tokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-[#94a3b8] whitespace-nowrap">
                      {r.uncached_tokens.toLocaleString()}
                    </td>
                    <td className="py-2.5 text-[#f1f5f9] whitespace-nowrap">
                      {r.ttft_ms} ms
                    </td>
                    <td className="py-2.5 text-right font-semibold text-[#10b981] whitespace-nowrap">
                      {r.saved_cost_usd > 0 ? `+$${r.saved_cost_usd.toFixed(4)}` : '$0.0000'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
