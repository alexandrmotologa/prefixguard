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
import { Activity, ShieldCheck, Download, Users } from 'lucide-react';

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
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1e2638]">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-[#f1f5f9] tracking-tight flex items-center gap-2">
              <span className="text-[#3b82f6]">prefixguard</span>
              <span className="text-xs px-2 py-0.5 rounded bg-[#1e2638] text-[#94a3b8] font-mono">v1.0.0</span>
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-[#111622] border border-[#1e2638]">
              <span className={connected ? 'pulse-indicator' : 'w-2 h-2 rounded-full bg-[#ef4444]'} />
              <span className="text-[#94a3b8]">{connected ? 'Live Stream Active' : 'Connecting...'}</span>
            </div>
          </div>
          <p className="text-xs text-[#64748b] mt-1">
            Zero-Invalidation Prompt Cache Optimizer, Token-Boundary Compiler & FinOps Reverse Proxy
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-lg bg-[#0d121d] border border-[#1e2638]">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'cockpit'
                ? 'bg-[#3b82f6] text-white shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            FinOps Cockpit
          </button>
          <button
            onClick={() => setActiveTab('chargeback')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'chargeback'
                ? 'bg-[#3b82f6] text-white shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            Cost Chargeback
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'playground'
                ? 'bg-[#3b82f6] text-white shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            Prompt Playground
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition ${
              activeTab === 'requests'
                ? 'bg-[#3b82f6] text-white shadow-sm'
                : 'text-[#94a3b8] hover:text-[#f1f5f9]'
            }`}
          >
            Live Requests ({requests.length})
          </button>
        </div>
      </div>

      {activeTab === 'cockpit' && (
        <>
          {/* Top 3 Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
        </>
      )}

      {activeTab === 'chargeback' && <ChargebackTable chargebacks={chargebacks} />}

      {activeTab === 'playground' && <PromptPlayground />}

      {activeTab === 'requests' && <RequestLogTable requests={requests} />}
    </div>
  );
};
