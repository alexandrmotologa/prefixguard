import React from 'react';
import { TeamChargeback } from '../types';
import { Users, Download, Shield } from 'lucide-react';

interface ChargebackTableProps {
  chargebacks: TeamChargeback[];
}

export const ChargebackTable: React.FC<ChargebackTableProps> = ({ chargebacks }) => {
  const handleDownloadCSV = () => {
    window.location.href = '/api/finops/export.csv';
  };

  return (
    <div className="glass-panel p-6 sm:p-7">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Multi-Tenant FinOps Cost Chargeback</h3>
            <p className="text-xs text-slate-400 mt-0.5">Team & Project Level Cache Attribution</p>
          </div>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#141b2c] hover:bg-[#1c263c] text-xs font-semibold font-mono text-white border border-white/[0.08] shadow-sm active:scale-[0.98] transition-all whitespace-nowrap self-start sm:self-auto"
        >
          <Download size={14} className="text-blue-400" />
          <span>Export FinOps CSV</span>
        </button>
      </div>

      {chargebacks.length === 0 ? (
        <div className="bg-[#090d17] p-8 rounded-xl border border-white/[0.06] text-center text-xs sm:text-sm text-slate-400 shadow-sm">
          No tagged team traffic recorded yet. Add header <code className="text-blue-400 font-mono bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">X-Team-ID: engineering-ai</code> to your agent calls to track team-by-team FinOps chargebacks.
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden bg-[#090d17]/90 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead>
                <tr className="bg-white/[0.03] border-b border-white/[0.08] text-slate-400 font-mono">
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Team ID</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Requests</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Total Tokens</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Cache Hit Rate</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Unoptimized Bill</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] whitespace-nowrap">Actual Cost</th>
                  <th className="py-3.5 px-4 font-semibold uppercase tracking-wider text-[11px] text-right whitespace-nowrap">Net Saved USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04] font-mono">
                {chargebacks.map((c, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 text-slate-100 font-sans font-medium flex items-center gap-2.5 whitespace-nowrap">
                      <div className="p-1 rounded-md bg-blue-500/10 text-blue-400">
                        <Shield size={12} />
                      </div>
                      <span>{c.team_id}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                      {c.total_requests.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 tabular-nums whitespace-nowrap">
                      {c.total_tokens.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-emerald-400 font-bold tabular-nums">
                        {(c.cache_hit_rate * 100).toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-red-400 line-through decoration-red-500/70 tabular-nums whitespace-nowrap">
                      ${c.total_raw_cost_usd.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-200 tabular-nums whitespace-nowrap">
                      ${c.total_actual_usd.toFixed(4)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                      +${c.total_saved_usd.toFixed(4)} ({c.savings_percentage.toFixed(0)}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
