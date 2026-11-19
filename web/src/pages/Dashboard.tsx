import React, { useEffect, useState } from 'react';
import { FinOpsSummary, RequestRecord, BusterStat, TeamChargeback } from '../types';
import { CacheHitGauge } from '../components/CacheHitGauge';
import { DollarSavingsCard } from '../components/DollarSavingsCard';
import { PrefixInspector } from '../components/PrefixInspector';
import { CacheBusterLog } from '../components/CacheBusterLog';
import { LatencyComparison } from '../components/LatencyComparison';
import { PromptPlayground } from '../components/PromptPlayground';
import { RequestLogTable } from '../components/RequestLogTable';
import { ChargebackTable } from '../components/ChargebackTable';
import { Shield } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<FinOpsSummary>({
    total_requests: 0,
    total_tokens: 0,
    uncached_tokens: 0,
    cache_read_tokens: 0,
    cache_write_tokens: 0,
    output_tokens: 0,
    overall_hit_rate: 0,
    total_raw_cost_usd: 0,
    total_actual_cost_usd: 0,
    total_saved_usd: 0,
    savings_percentage: 0,
    avg_latency_ms: 0,
    avg_ttft_ms: 0,
    total_busters_repaired: 0,
  });

  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [busters, setBusters] = useState<BusterStat[]>([]);
  const [chargebacks, setChargebacks] = useState<TeamChargeback[]>([]);
  const [activeTab, setActiveTab] = useState<'cockpit' | 'chargeback' | 'playground' | 'requests'>('cockpit');
  const [connected, setConnected] = useState(false);

  const fetchInitialData = async () => {
    try {
      const [sumRes, reqRes, busterRes, cbRes] = await Promise.all([
        fetch('/api/finops/summary'),
        fetch('/api/finops/requests?limit=50'),
        fetch('/api/finops/busters'),
        fetch('/api/finops/chargeback'),
      ]);

      if (sumRes.ok) setSummary(await sumRes.json());
      if (reqRes.ok) setRequests(await reqRes.json());
      if (busterRes.ok) setBusters(await busterRes.json());
      if (cbRes.ok) setChargebacks(await cbRes.json());
    } catch (err) {
      console.error('Failed to fetch initial telemetry:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();

    const eventSource = new EventSource('/api/finops/stream');

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.addEventListener('finops_update', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.payload) {
          setSummary(data.payload);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    eventSource.addEventListener('request_intercepted', (e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        if (data.payload) {
          setRequests((prev) => [data.payload, ...prev.slice(0, 49)]);
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 space-y-8">
      {/* Top Bar Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-white/[0.08]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400">
                <Shield size={22} className="text-blue-400" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span>prefixguard</span>
                <span className="text-xs px-2.5 py-1 rounded-md bg-white/[0.06] text-slate-300 font-mono font-medium border border-white/[0.08]">
                  v1.0.0
                </span>
              </h1>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono bg-[#0d1322] border border-white/[0.08] shadow-sm">
              <span className={connected ? 'pulse-indicator' : 'w-2 h-2 rounded-full bg-red-500'} />
              <span className={connected ? 'text-emerald-400 font-medium' : 'text-slate-400'}>
                {connected ? 'Live Stream Active' : 'Connecting...'}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-2xl font-normal leading-relaxed">
            Zero-Invalidation Prompt Cache Optimizer, Token-Boundary Compiler & FinOps Reverse Proxy
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#0b0f19] border border-white/[0.08] shadow-inner">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap active:scale-[0.98] transition-all duration-150 ${
              activeTab === 'cockpit'
                ? 'bg-blue-600 text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_10px_rgba(59,130,246,0.35)] border border-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            FinOps Cockpit
          </button>
          <button
            onClick={() => setActiveTab('chargeback')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap active:scale-[0.98] transition-all duration-150 ${
              activeTab === 'chargeback'
                ? 'bg-blue-600 text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_10px_rgba(59,130,246,0.35)] border border-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            Cost Chargeback
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap active:scale-[0.98] transition-all duration-150 ${
              activeTab === 'playground'
                ? 'bg-blue-600 text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_10px_rgba(59,130,246,0.35)] border border-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            Prompt Playground
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap active:scale-[0.98] transition-all duration-150 ${
              activeTab === 'requests'
                ? 'bg-blue-600 text-white font-semibold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_2px_10px_rgba(59,130,246,0.35)] border border-blue-400/40'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.05] border border-transparent'
            }`}
          >
            Live Requests ({requests.length})
          </button>
        </div>
      </div>

      {activeTab === 'cockpit' && (
        <div className="space-y-8">
          {/* Top 3 Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <CacheHitGauge
              hitRate={summary.overall_hit_rate}
              cacheReadTokens={summary.cache_read_tokens}
              totalTokens={summary.total_tokens}
            />
            <DollarSavingsCard
              totalSavedUSD={summary.total_saved_usd}
              totalRawCostUSD={summary.total_raw_cost_usd}
              totalActualCostUSD={summary.total_actual_cost_usd}
              savingsPercentage={summary.savings_percentage}
              totalRequests={summary.total_requests}
            />
            <PrefixInspector
              staticTokens={Math.max(1024, summary.cache_read_tokens > 0 ? summary.cache_read_tokens : 1024)}
              dynamicTokens={Math.max(48, summary.uncached_tokens > 0 ? summary.uncached_tokens : 48)}
              paddingTokens={0}
              toolsCount={4}
              bustersCount={summary.total_busters_repaired}
              prefixHash="c03a7eb1468a0951"
            />
          </div>

          {/* Middle Row: Latency Comparison and Buster Log */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
            <LatencyComparison
              avgTTFTMs={summary.avg_ttft_ms}
              avgLatencyMs={summary.avg_latency_ms}
            />
            <CacheBusterLog
              stats={busters}
              totalRepaired={summary.total_busters_repaired}
            />
          </div>

          {/* Chargeback Preview */}
          <ChargebackTable chargebacks={chargebacks} />

          {/* Interactive Playground Section embedded in dashboard */}
          <PromptPlayground />

          {/* Recent Interceptions */}
          <RequestLogTable requests={requests} />
        </div>
      )}

      {activeTab === 'chargeback' && (
        <div className="pt-2">
          <ChargebackTable chargebacks={chargebacks} />
        </div>
      )}

      {activeTab === 'playground' && (
        <div className="pt-2">
          <PromptPlayground />
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="pt-2">
          <RequestLogTable requests={requests} />
        </div>
      )}
    </div>
  );
};
