import React from 'react';
import { Layers, AlertTriangle, Shield, Cpu } from 'lucide-react';

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
    <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between" style={{ minHeight: '340px' }}>
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Layers size={20} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Prompt Topology Inspector</h3>
              <p className="text-xs text-slate-400 mt-0.5">Deterministic Prefix Segmentation</p>
            </div>
          </div>
          <span className="font-mono text-xs px-3 py-1.5 rounded-lg bg-[#090d17] text-cyan-400 border border-white/[0.08] shadow-sm font-medium">
            Hash: {prefixHash ? prefixHash.slice(0, 10) : 'c03a7eb...'}
          </span>
        </div>

        {/* Segmented Token Bar */}
        <div className="my-4">
          <div className="flex justify-between text-xs text-slate-300 mb-2 font-mono font-medium">
            <span>Static Invariant Prefix ({staticTokens}t)</span>
            <span>Dynamic Suffix ({dynamicTokens}t)</span>
          </div>
          <div className="h-4 w-full bg-[#090d17] rounded-full overflow-hidden flex border border-white/[0.08] shadow-inner p-0.5">
            <div
              style={{ width: `${staticPct}%` }}
              className="bg-emerald-500 h-full rounded-full transition-all duration-500 shadow-sm"
              title={`Static Invariant Prefix: ${staticTokens} tokens (${staticPct}%)`}
            />
            {paddingTokens > 0 && (
              <div
                style={{ width: `${paddingPct}%` }}
                className="bg-blue-500 h-full rounded-full transition-all duration-500 shadow-sm"
                title={`Smart Boundary Padding: ${paddingTokens} tokens (${paddingPct}%)`}
              />
            )}
            <div
              style={{ width: `${dynamicPct}%` }}
              className="bg-amber-500 h-full rounded-full transition-all duration-500 shadow-sm"
              title={`Dynamic Volatile Suffix: ${dynamicTokens} tokens (${dynamicPct}%)`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-3 font-medium">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/40" />
              <span>Immutable Prefix ({staticPct}%)</span>
            </div>
            {paddingTokens > 0 && (
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/40" />
                <span>Threshold Padding</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/40" />
              <span>Trailing Volatiles ({dynamicPct}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom 3 Verified Attribute Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/[0.06]">
        <div className="bg-[#090d17] p-3 sm:p-3.5 rounded-xl border border-white/[0.06] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Shield size={13} className="text-emerald-400 flex-shrink-0" />
            <span className="font-medium">Boundary</span>
          </div>
          <div className="font-mono text-xs font-bold text-slate-200">
            {staticTokens >= 1024 ? '1,024+ Certified' : 'Auto-Aligned'}
          </div>
        </div>

        <div className="bg-[#090d17] p-3 sm:p-3.5 rounded-xl border border-white/[0.06] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <Cpu size={13} className="text-cyan-400 flex-shrink-0" />
            <span className="font-medium">Tools Sorted</span>
          </div>
          <div className="font-mono text-xs font-bold text-slate-200">
            {toolsCount > 0 ? `${toolsCount} Deterministic` : 'Canonical'}
          </div>
        </div>

        <div className="bg-[#090d17] p-3 sm:p-3.5 rounded-xl border border-white/[0.06] shadow-sm">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
            <AlertTriangle size={13} className="text-amber-400 flex-shrink-0" />
            <span className="font-medium">Busters Fixed</span>
          </div>
          <div className="font-mono text-xs font-bold text-amber-400">
            {bustersCount} Relocated
          </div>
        </div>
      </div>
    </div>
  );
};
