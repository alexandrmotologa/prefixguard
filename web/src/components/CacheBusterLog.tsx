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
        return <Clock size={14} className="text-[#3b82f6]" />;
      case 'session_id':
        return <Hash size={14} className="text-[#f59e0b]" />;
      case 'uuid':
        return <Fingerprint size={14} className="text-[#8b5cf6]" />;
      default:
        return <AlertCircle size={14} className="text-[#06b6d4]" />;
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <ShieldAlert size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#f1f5f9' }}>Cache Buster Neutralization Log</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>Dynamic Volatile Variables Extracted & Relocated</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-[#0d121d] text-[#10b981] border border-[#1e2638]">
          <Check size={12} />
          <span>{totalRepaired} Invariants Preserved</span>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="bg-[#0d121d] p-6 rounded-lg text-center text-sm text-[#64748b]">
          No volatile variables intercepted yet. As prompt traffic passes through the proxy, dynamic preambles will be listed here.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-[#0d121d] p-3.5 rounded-lg border border-[#1e2638] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded bg-[#111622]">
                  {getIcon(stat.buster_type)}
                </div>
                <div>
                  <div className="text-xs font-semibold text-[#f1f5f9] capitalize">
                    {stat.buster_type.replace('_', ' ')}
                  </div>
                  <div className="text-[11px] text-[#64748b]">Auto-relocated to suffix</div>
                </div>
              </div>
              <span className="font-mono text-sm font-bold text-[#f59e0b] px-2 py-0.5 rounded bg-[#161c2c]">
                {stat.count}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
