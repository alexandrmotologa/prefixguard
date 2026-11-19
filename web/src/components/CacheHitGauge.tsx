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
  const radius = 70;
  const strokeWidth = 14;
  const normalizedRadius = radius - strokeWidth * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  // Semi-circle or 270-degree arc
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (arcLength * Math.min(percentage, 100)) / 100;

  const isSuccess = percentage >= 85;
  const color = isSuccess ? '#10b981' : percentage >= 50 ? '#06b6d4' : '#f59e0b';

  return (
    <div className="glass-panel p-6 flex flex-col items-center justify-between relative overflow-hidden" style={{ minHeight: '320px' }}>
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
            <Zap size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Real-World Cache Hit Rate</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Frontier KV-Cache Token Reuse</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-medium whitespace-nowrap"
             style={{ background: isSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: color }}>
          <Target size={12} />
          <span className="whitespace-nowrap">Goal: &gt;85%</span>
        </div>
      </div>

      <div className="relative flex items-center justify-center my-4">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-135">
          {/* Background Track */}
          <circle
            stroke="#1e2638"
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
              transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease',
              strokeLinecap: 'round',
            }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
        </svg>

        {/* Center Label */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="font-mono text-3xl font-bold tracking-tight" style={{ color: '#f8fafc' }}>
            {percentage.toFixed(1)}%
          </span>
          <span className="text-xs uppercase font-semibold tracking-wider mt-0.5" style={{ color: color }}>
            {isSuccess ? 'Cache Optimal' : percentage > 0 ? 'Warming Up' : 'Standby'}
          </span>
        </div>
      </div>

      <div className="w-full grid grid-cols-2 gap-3 pt-3 border-t" style={{ borderColor: 'var(--border-card)' }}>
        <div className="bg-[#0d121d] p-2.5 rounded-lg text-center">
          <div className="text-xs text-[#94a3b8]">Cached Tokens Read</div>
          <div className="font-mono text-sm font-semibold text-[#10b981] mt-0.5">
            {cacheReadTokens.toLocaleString()}
          </div>
        </div>
        <div className="bg-[#0d121d] p-2.5 rounded-lg text-center">
          <div className="text-xs text-[#94a3b8]">Total Tokens Managed</div>
          <div className="font-mono text-sm font-semibold text-[#f1f5f9] mt-0.5">
            {totalTokens.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
