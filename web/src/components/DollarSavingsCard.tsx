import React from 'react';
import { DollarSign, TrendingDown, ArrowUpRight, ShieldCheck } from 'lucide-react';

interface DollarSavingsCardProps {
  totalSavedUSD: number;
  totalRawCostUSD: number;
  totalActualCostUSD: number;
  savingsPercentage: number;
  totalRequests: number;
}

export const DollarSavingsCard: React.FC<DollarSavingsCardProps> = ({
  totalSavedUSD,
  totalRawCostUSD,
  totalActualCostUSD,
  savingsPercentage,
  totalRequests,
}) => {
  // 30-day projected savings based on current traffic
  const projectedMonthlyUSD = totalRequests > 0 ? (totalSavedUSD / Math.max(1, totalRequests)) * (totalRequests * 30) : 0;

  return (
    <div className="glass-panel-glow p-6 flex flex-col justify-between relative overflow-hidden" style={{ minHeight: '320px' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <DollarSign size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Cumulative FinOps Savings</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Direct LLM Invoice Reductions</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap"
             style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10b981' }}>
          <TrendingDown size={14} />
          <span className="whitespace-nowrap">-{savingsPercentage.toFixed(1)}% Cost</span>
        </div>
      </div>

      <div className="my-2">
        <div className="text-xs uppercase font-semibold tracking-wider text-[#94a3b8] mb-1">
          Net Verified Savings
        </div>
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-4xl font-extrabold text-[#10b981] tracking-tight">
            ${totalSavedUSD.toFixed(4)}
          </span>
          <span className="text-xs text-[#64748b] font-mono">USD</span>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-xs text-[#94a3b8]">
          <ShieldCheck size={14} className="text-[#3b82f6]" />
          <span>Saved across {totalRequests.toLocaleString()} intercepted inference calls</span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-card)' }}>
        <div className="bg-[#0d121d] p-2.5 rounded-lg">
          <div className="text-xs text-[#64748b]">Unoptimized Invoice</div>
          <div className="font-mono text-sm font-semibold text-[#ef4444] mt-0.5 line-through decoration-red-500/60">
            ${totalRawCostUSD.toFixed(4)}
          </div>
          <div className="text-[10px] text-[#64748b] mt-0.5">Without caching</div>
        </div>
        <div className="bg-[#0d121d] p-2.5 rounded-lg">
          <div className="text-xs text-[#64748b]">Actual Billed Cost</div>
          <div className="font-mono text-sm font-semibold text-[#10b981] mt-0.5">
            ${totalActualCostUSD.toFixed(4)}
          </div>
          <div className="text-[10px] text-[#10b981] mt-0.5 flex items-center gap-0.5">
            <ArrowUpRight size={10} />
            {savingsPercentage.toFixed(0)}% ROI margin
          </div>
        </div>
      </div>
    </div>
  );
};
