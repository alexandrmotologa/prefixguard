import React from 'react';
import { Layers, CheckCircle2, AlertTriangle, Shield, Cpu } from 'lucide-react';

interface PrefixInspectorProps {
  staticTokens: number;
  dynamicTokens: number;
  paddingTokens: number;
  toolsCount: number;
  bustersCount: number;
  prefixHash: string;
}

export const PrefixInspector: React.FC<PrefixInspectorProps> = ({
  staticTokens,
  dynamicTokens,
  paddingTokens,
  toolsCount,
  bustersCount,
  prefixHash,
}) => {
  const total = Math.max(1, staticTokens + dynamicTokens + paddingTokens);
  const staticPct = Math.round((staticTokens / total) * 100);
  const paddingPct = Math.round((paddingTokens / total) * 100);
  const dynamicPct = Math.max(0, 100 - staticPct - paddingPct);

  return (
    <div className="glass-panel p-6 flex flex-col justify-between" style={{ minHeight: '320px' }}>
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4' }}>
              <Layers size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Prompt Topology Inspector</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Deterministic Prefix Segmentation</p>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#0d121d] text-[#06b6d4] border border-[#1e2638]">
            Hash: {prefixHash ? prefixHash.slice(0, 10) : 'c03a7eb...'}
          </span>
        </div>

        {/* Segmented Token Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs text-[#94a3b8] mb-1.5 font-mono">
            <span>Static Invariant Prefix ({staticTokens}t)</span>
            <span>Dynamic Suffix ({dynamicTokens}t)</span>
          </div>
          <div className="h-3 w-full bg-[#0d121d] rounded-full overflow-hidden flex border border-[#1e2638]">
            <div
              style={{ width: `${staticPct}%` }}
              className="bg-[#10b981] h-full transition-all duration-500"
              title={`Static Invariant Prefix: ${staticTokens} tokens (${staticPct}%)`}
            />
            {paddingTokens > 0 && (
              <div
                style={{ width: `${paddingPct}%` }}
                className="bg-[#3b82f6] h-full transition-all duration-500"
                title={`Smart Boundary Padding: ${paddingTokens} tokens (${paddingPct}%)`}
              />
            )}
            <div
              style={{ width: `${dynamicPct}%` }}
              className="bg-[#f59e0b] h-full transition-all duration-500"
              title={`Dynamic Volatile Suffix: ${dynamicTokens} tokens (${dynamicPct}%)`}
            />
          </div>
          <div className="flex items-center gap-4 text-[11px] text-[#94a3b8] mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#10b981]" />
              <span>Immutable Prefix ({staticPct}%)</span>
            </div>
            {paddingTokens > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#3b82f6]" />
                <span>Threshold Padding</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#f59e0b]" />
              <span>Trailing Volatiles ({dynamicPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5 pt-3 border-t" style={{ borderColor: 'var(--border-card)' }}>
        <div className="bg-[#0d121d] p-2.5 rounded-lg">
          <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] mb-0.5">
            <Shield size={12} className="text-[#10b981]" />
            <span>Boundary</span>
          </div>
          <div className="font-mono text-xs font-semibold text-[#f1f5f9]">
            {staticTokens >= 1024 ? '1,024+ Certified' : 'Auto-Aligned'}
          </div>
        </div>

        <div className="bg-[#0d121d] p-2.5 rounded-lg">
          <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] mb-0.5">
            <Cpu size={12} className="text-[#06b6d4]" />
            <span>Tools Sorted</span>
          </div>
          <div className="font-mono text-xs font-semibold text-[#f1f5f9]">
            {toolsCount > 0 ? `${toolsCount} Deterministic` : 'Canonical'}
          </div>
        </div>

        <div className="bg-[#0d121d] p-2.5 rounded-lg">
          <div className="flex items-center gap-1 text-[11px] text-[#94a3b8] mb-0.5">
            <AlertTriangle size={12} className="text-[#f59e0b]" />
            <span>Busters Fixed</span>
          </div>
          <div className="font-mono text-xs font-semibold text-[#f59e0b]">
            {bustersCount} Relocated
          </div>
        </div>
      </div>
    </div>
  );
};
