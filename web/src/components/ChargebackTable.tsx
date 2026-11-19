import React from 'react';
import { TeamChargeback } from '../types';
import { Users, Download, TrendingDown, Shield } from 'lucide-react';

interface ChargebackTableProps {
  chargebacks: TeamChargeback[];
}

export const ChargebackTable: React.FC<ChargebackTableProps> = ({ chargebacks }) => {
  const handleDownloadCSV = () => {
    window.location.href = '/api/finops/export.csv';
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Users size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Multi-Tenant FinOps Cost Chargeback</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Team & Project Level Cache Attribution</p>
          </div>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#161c2c] hover:bg-[#1e2638] text-xs font-mono text-[#f1f5f9] border border-[#1e2638] whitespace-nowrap transition"
        >
          <Download size={14} className="text-[#3b82f6]" />
          <span>Export FinOps CSV</span>
        </button>
      </div>

      {chargebacks.length === 0 ? (
        <div className="bg-[#0d121d] p-6 rounded-lg text-center text-sm text-[#64748b]">
          No tagged team traffic recorded yet. Add header <code className="text-[#3b82f6]">X-Team-ID: engineering-ai</code> to your agent calls to track team-by-team FinOps chargebacks.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead>
              <tr className="border-b border-[#1e2638] text-[#94a3b8] font-mono">
                <th className="pb-2.5 font-medium whitespace-nowrap">Team ID</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Requests</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Total Tokens</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Cache Hit Rate</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Unoptimized Bill</th>
                <th className="pb-2.5 font-medium whitespace-nowrap">Actual Cost</th>
                <th className="pb-2.5 font-medium text-right whitespace-nowrap">Net Saved USD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2638]/60 font-mono">
              {chargebacks.map((c, i) => (
                <tr key={i} className="hover:bg-[#141b2a]/50 transition">
                  <td className="py-2.5 text-[#f1f5f9] font-sans font-medium flex items-center gap-2 whitespace-nowrap">
                    <Shield size={12} className="text-[#3b82f6]" />
                    <span>{c.team_id}</span>
                  </td>
                  <td className="py-2.5 text-[#94a3b8] whitespace-nowrap">
                    {c.total_requests.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-[#94a3b8] whitespace-nowrap">
                    {c.total_tokens.toLocaleString()}
                  </td>
                  <td className="py-2.5 whitespace-nowrap">
                    <span className="text-[#10b981] font-semibold">
                      {(c.cache_hit_rate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2.5 text-[#ef4444] line-through decoration-red-500/60 whitespace-nowrap">
                    ${c.total_raw_cost_usd.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-[#f1f5f9] whitespace-nowrap">
                    ${c.total_actual_usd.toFixed(4)}
                  </td>
                  <td className="py-2.5 text-right font-semibold text-[#10b981] whitespace-nowrap">
                    +${c.total_saved_usd.toFixed(4)} ({c.savings_percentage.toFixed(0)}%)
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
