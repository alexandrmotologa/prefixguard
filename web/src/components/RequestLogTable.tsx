import React from 'react';
import { RequestRecord } from '../types';
import { Activity, Zap, AlertTriangle } from 'lucide-react';

interface RequestLogTableProps {
  requests: RequestRecord[];
}

export const RequestLogTable: React.FC<RequestLogTableProps> = ({ requests }) => {
  return (
    <div className="glass-panel p-6 sm:p-7">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Real-Time Inference Interception Stream</h3>
            <p className="text-xs text-slate-400 mt-0.5">Live Wire-Speed Telemetry</p>
          </div>
        </div>
        <span className="text-xs text-slate-300 font-mono font-medium px-3 py-1.5 rounded-lg bg-[#090d17] border border-white/[0.08] shadow-sm">
          {requests.length} Interceptions
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="bg-[#090d17] p-8 rounded-xl border border-white/[0.06] text-center text-xs sm:text-sm text-slate-400 shadow-sm">
          Awaiting incoming proxy traffic. Direct your LLM client or agent harness to{' '}
          <code className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
            http://localhost:8585
          </code>{' '}
          to see requests live.
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#090d17]/90 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[760px]">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400 font-mono">
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Timestamp</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Model</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Prefix Hash</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Cached Read</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Uncached</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">TTFT</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] text-right whitespace-nowrap">Saved USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {requests.map((r) => {
                  const isHit = r.cache_read_tokens > 0;
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 text-slate-400 tabular-nums whitespace-nowrap">
                        {new Date(r.timestamp).toLocaleTimeString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-100 font-sans font-medium whitespace-nowrap">
                        {r.model}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-semibold whitespace-nowrap ${
                            isHit
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                          }`}
                        >
                          {isHit ? <Zap size={11} /> : <AlertTriangle size={11} />}
                          <span>{isHit ? 'Cache Hit' : 'Cache Write'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-cyan-400 font-medium whitespace-nowrap">
                        {r.prefix_hash ? r.prefix_hash.slice(0, 10) : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-emerald-400 font-bold tabular-nums whitespace-nowrap">
                        {r.cache_read_tokens.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                        {r.uncached_tokens.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-100 tabular-nums whitespace-nowrap">
                        {r.ttft_ms} ms
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                        {r.saved_cost_usd > 0 ? `+$${r.saved_cost_usd.toFixed(4)}` : '$0.0000'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
