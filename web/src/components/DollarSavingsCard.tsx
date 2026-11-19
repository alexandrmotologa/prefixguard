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
  return (
    <div className="glass-panel-glow p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden" style={{ minHeight: '340px' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <DollarSign size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Cumulative FinOps Savings</h3>
            <p className="text-xs text-slate-400 mt-0.5">Direct LLM Invoice Reductions</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold whitespace-nowrap bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shadow-sm">
          <TrendingDown size={14} />
          <span>-{savingsPercentage.toFixed(1)}% Cost</span>
        </div>
      </div>

      {/* Main Net Savings Metric */}
      <div className="my-5">
        <div className="text-xs uppercase font-semibold tracking-wider text-slate-400 mb-1.5">
          Net Verified Savings
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="font-mono text-4xl sm:text-5xl font-extrabold text-emerald-400 tracking-tight tabular-nums">
            ${totalSavedUSD.toFixed(4)}
          </span>
          <span className="text-xs text-slate-500 font-mono font-medium">USD</span>
        </div>
        <div className="flex items-center gap-2 mt-3 text-xs text-slate-400">
          <ShieldCheck size={15} className="text-blue-400 flex-shrink-0" />
          <span>Saved across {totalRequests.toLocaleString()} intercepted inference calls</span>
        </div>
      </div>

      {/* Bottom Breakdown Tiles */}
      <div className="w-full grid grid-cols-2 gap-3.5 pt-4 border-t border-white/[0.06]">
        <div className="bg-[#090d17] p-3.5 sm:p-4 rounded-xl border border-white/[0.06] shadow-sm">
          <div className="text-xs font-medium text-slate-400">Unoptimized Invoice</div>
          <div className="font-mono text-sm sm:text-base font-bold text-red-400 mt-1 line-through decoration-red-500/70 tabular-nums">
            ${totalRawCostUSD.toFixed(4)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Without caching</div>
        </div>
        <div className="bg-[#090d17] p-3.5 sm:p-4 rounded-xl border border-white/[0.06] shadow-sm">
          <div className="text-xs font-medium text-slate-400">Actual Billed Cost</div>
          <div className="font-mono text-sm sm:text-base font-bold text-emerald-400 mt-1 tabular-nums">
            ${totalActualCostUSD.toFixed(4)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <ArrowUpRight size={12} />
            <span>{savingsPercentage.toFixed(0)}% ROI margin</span>
          </div>
        </div>
      </div>
    </div>
  );
};
