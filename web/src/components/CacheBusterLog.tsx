import React from 'react';
import { AlertCircle, Clock, Hash, Fingerprint, ShieldAlert, Check } from 'lucide-react';
import { BusterStat } from '../types';

interface CacheBusterLogProps {
  stats: BusterStat[];
  totalRepaired: number;
}

export const CacheBusterLog: React.FC<CacheBusterLogProps> = ({ stats, totalRepaired }) => {
  const getIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'timestamp':
        return <Clock size={16} className="text-blue-400" />;
      case 'session_id':
        return <Hash size={16} className="text-amber-400" />;
      case 'uuid':
        return <Fingerprint size={16} className="text-purple-400" />;
      default:
        return <AlertCircle size={16} className="text-cyan-400" />;
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-7 flex flex-col justify-between" style={{ minHeight: '340px' }}>
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Cache Buster Neutralization Log</h3>
            <p className="text-xs text-slate-400 mt-0.5">Dynamic Volatile Variables Extracted & Relocated</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm whitespace-nowrap">
          <Check size={14} />
          <span>{totalRepaired} Invariants Preserved</span>
        </div>
      </div>

      {/* Buster Cards Grid */}
      <div className="my-auto py-4">
        {stats.length === 0 ? (
          <div className="bg-[#090d17] p-8 rounded-xl border border-white/[0.06] text-center text-xs sm:text-sm text-slate-400 shadow-sm">
            No volatile variables intercepted yet. As prompt traffic passes through the proxy, dynamic preambles will be listed here.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {stats.map((stat, idx) => (
              <div
                key={idx}
                className="bg-[#090d17] p-4 rounded-xl border border-white/[0.06] hover:border-amber-500/30 transition-all duration-200 flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]">
                    {getIcon(stat.buster_type)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-100 capitalize">
                      {stat.buster_type.replace('_', ' ')}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">Auto-relocated to suffix</div>
                  </div>
                </div>
                <span className="font-mono text-xs sm:text-sm font-bold text-amber-400 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20 tabular-nums">
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subtle Bottom Footer Note */}
      <div className="pt-3 border-t border-white/[0.06] text-[11px] text-slate-500 flex items-center justify-between">
        <span>Deterministic boundary regex compiled at startup</span>
        <span className="font-mono">Zero-TTL Leakage</span>
      </div>
    </div>
  );
};
