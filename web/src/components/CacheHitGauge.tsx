import React from 'react';
import { Target, Zap } from 'lucide-react';

interface CacheHitGaugeProps {
  hitRate: number; // 0.0 to 1.0
  cacheReadTokens: number;
  totalTokens: number;
}

export const CacheHitGauge: React.FC<CacheHitGaugeProps> = ({
  hitRate,
  cacheReadTokens,
  totalTokens,
}) => {
  const percentage = Math.round(hitRate * 1000) / 10;
  const radius = 72;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Semi-circle or 270-degree arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * Math.min(percentage, 100)) / 100;

  const isSuccess = percentage >= 85;
  const color = isSuccess ? '#10b981' : percentage >= 50 ? '#06b6d4' : '#f59e0b';

  return (
    <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden" style={{ minHeight: '340px' }}>
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Zap size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Real-World Cache Hit Rate</h3>
            <p className="text-xs text-slate-400 mt-0.5">Frontier KV-Cache Token Reuse</p>
          </div>
        </div>
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-medium whitespace-nowrap shadow-sm border border-emerald-500/20"
          style={{ background: isSuccess ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)', color: color }}
        >
          <Target size={13} />
          <span>Goal: &gt;85%</span>
        </div>
      </div>

      {/* Radial Gauge */}
      <div className="relative flex items-center justify-center my-6">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-135 drop-shadow-md">
          {/* Background Track */}
          <circle
            stroke="#162032"
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            style={{ strokeDashoffset: 0, strokeLinecap: 'round' }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          {/* Foreground Progress */}
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            style={{
              strokeDashoffset,
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1), stroke 0.4s ease',
              strokeLinecap: 'round',
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono text-3xl sm:text-4xl font-extrabold tracking-tight text-white tabular-nums">
            {percentage.toFixed(1)}%
          </span>
          <span className="text-xs uppercase font-bold tracking-wider mt-1 px-2 py-0.5 rounded-full bg-white/[0.05]" style={{ color: color }}>
            {isSuccess ? 'Cache Optimal' : percentage > 0 ? 'Warming Up' : 'Standby'}
          </span>
        </div>
      </div>

      {/* Bottom Token Stats */}
      <div className="w-full grid grid-cols-2 gap-3.5 pt-4 border-t border-white/[0.06]">
        <div className="bg-[#090d17] p-3.5 sm:p-4 rounded-xl border border-white/[0.06] text-center shadow-sm">
          <div className="text-xs font-medium text-slate-400">Cached Tokens Read</div>
          <div className="font-mono text-base font-bold text-emerald-400 mt-1 tabular-nums">
            {cacheReadTokens.toLocaleString()}
          </div>
        </div>
        <div className="bg-[#090d17] p-3.5 sm:p-4 rounded-xl border border-white/[0.06] text-center shadow-sm">
          <div className="text-xs font-medium text-slate-400">Total Tokens Managed</div>
          <div className="font-mono text-base font-bold text-slate-100 mt-1 tabular-nums">
            {totalTokens.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
