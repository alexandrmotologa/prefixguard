import React, { useState } from 'react';
import { Play, Sparkles, Copy, Check, ArrowRight, ShieldCheck, Layers, GitCompare } from 'lucide-react';
import { AnalyzeResponse } from '../types';

const PRESET_UNSTABLE = `{
  "model": "claude-3-5-sonnet-20241022",
  "system": "You are a quantitative finance agent. Current time: 2026-11-19 20:25:00 UTC. User: usr_hedgefund99. Session: sess_9876543210abcdef. Adhere strictly to institutional risk guidelines.",
  "tools": [
    {"name": "fetch_quote", "description": "Fetches current price"},
    {"name": "calculate_risk", "description": "Computes portfolio VaR"}
  ],
  "messages": [
    {"role": "user", "content": "Analyze risk exposure on TSLA position."}
  ]
}`;

const PRESET_SUB_THRESHOLD = `{
  "model": "claude-3-5-sonnet-20241022",
  "system": "You are a specialized code reviewer. Always verify unit test coverage, validate type safety invariants, and inspect error propagation channels across concurrent worker goroutines.",
  "messages": [
    {"role": "user", "content": "Review this pull request."}
  ]
}`;

export const PromptPlayground: React.FC = () => {
  const [inputPrompt, setInputPrompt] = useState(PRESET_UNSTABLE);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [viewMode, setViewMode] = useState<'json' | 'diff'>('json');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: inputPrompt,
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      const data: AnalyzeResponse = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Audit failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.optimized_body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#f1f5f9] flex items-center gap-2">
            <Sparkles size={18} className="text-[#3b82f6]" />
            <span>Interactive Prompt Topology Optimizer & Sandbox</span>
          </h3>
          <p className="text-xs text-[#64748b]">
            Test any agent prompt to inspect volatile variable extraction, multi-tier breakpoints, and token boundary alignment
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[#94a3b8] whitespace-nowrap">Presets:</span>
          <button
            onClick={() => setInputPrompt(PRESET_UNSTABLE)}
            className="px-2.5 py-1 text-xs rounded bg-[#161c2c] hover:bg-[#1e2638] text-[#f1f5f9] border border-[#1e2638] whitespace-nowrap transition"
          >
            Volatile Preamble
          </button>
          <button
            onClick={() => setInputPrompt(PRESET_SUB_THRESHOLD)}
            className="px-2.5 py-1 text-xs rounded bg-[#161c2c] hover:bg-[#1e2638] text-[#f1f5f9] border border-[#1e2638] whitespace-nowrap transition"
          >
            Sub-Threshold Padding
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Input */}
        <div>
          <div className="flex justify-between items-center mb-1 text-xs text-[#94a3b8] font-mono">
            <span>Raw Inbound Prompt JSON</span>
            <span className="text-[#f59e0b]">Unstable Topologies Destabilize Cache</span>
          </div>
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            rows={14}
            className="w-full bg-[#0d121d] border border-[#1e2638] rounded-lg p-3 text-xs font-mono text-[#e2e8f0] focus:outline-none focus:border-[#3b82f6] resize-none"
            placeholder="Paste your JSON prompt payload here..."
          />
          <button
            onClick={handleAudit}
            disabled={loading}
            className="mt-3 w-full py-2.5 px-4 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white text-xs font-semibold flex items-center justify-center gap-2 whitespace-nowrap transition"
          >
            <Play size={14} />
            <span>{loading ? 'Optimizing...' : 'Run Cache Audit & Compile Invariants'}</span>
          </button>
        </div>

        {/* Right: Output */}
        <div>
          <div className="flex justify-between items-center mb-1 text-xs text-[#94a3b8] font-mono">
            <div className="flex items-center gap-2">
              <span>Compiled Output</span>
              {result && (
                <div className="flex items-center gap-1 bg-[#161c2c] p-0.5 rounded border border-[#1e2638]">
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2 py-0.5 text-[10px] rounded whitespace-nowrap transition ${viewMode === 'json' ? 'bg-[#3b82f6] text-white font-medium' : 'text-[#94a3b8]'}`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setViewMode('diff')}
                    className={`px-2 py-0.5 text-[10px] rounded flex items-center gap-1 whitespace-nowrap transition ${viewMode === 'diff' ? 'bg-[#3b82f6] text-white font-medium' : 'text-[#94a3b8]'}`}
                  >
                    <GitCompare size={10} />
                    <span>Diff</span>
                  </button>
                </div>
              )}
            </div>

            {result && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[#3b82f6] hover:text-[#60a5fa] whitespace-nowrap"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            )}
          </div>

          {result ? (
            <div>
              {viewMode === 'json' ? (
                <pre className="w-full bg-[#0d121d] border border-[#1e2638] rounded-lg p-3 text-xs font-mono text-[#10b981] overflow-auto h-[290px]">
                  {JSON.stringify(JSON.parse(result.optimized_body), null, 2)}
                </pre>
              ) : (
                <div className="w-full bg-[#0d121d] border border-[#1e2638] rounded-lg p-3 text-xs font-mono overflow-auto h-[290px] space-y-2">
                  <div className="text-xs text-[#94a3b8] font-semibold border-b border-[#1e2638] pb-1">
                    Neutralized Dynamic Variables ({result.report.busters_detected.length} extracted):
                  </div>
                  {result.report.busters_detected.map((b, idx) => (
                    <div key={idx} className="p-2 rounded bg-[#161c2c] border border-[#1e2638]">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#f59e0b] font-bold">[{b.type}]</span>
                        <span className="text-[#64748b] whitespace-nowrap">Relocated to Suffix</span>
                      </div>
                      <div className="text-[#ef4444] line-through text-[11px] mt-0.5 break-all">
                        - {b.value}
                      </div>
                      <div className="text-[#10b981] text-[11px] break-all">
                        + {b.placeholder}
                      </div>
                    </div>
                  ))}
                  {result.report.was_padded && (
                    <div className="p-2 rounded bg-[#161c2c] border border-[#3b82f6]/40 text-[#3b82f6] text-[11px]">
                      + [Smart Boundary Padding: +{result.report.padding_added} certified invariant tokens added to cross 1024 threshold]
                    </div>
                  )}
                </div>
              )}

              <div className="mt-3 p-3 bg-[#0d121d] border border-[#1e2638] rounded-lg flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#10b981]" />
                  <span className="font-semibold text-[#f1f5f9] whitespace-nowrap">
                    Projected Hit: {Math.round(result.report.estimated_hit_rate * 100)}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[#94a3b8] font-mono text-[11px]">
                  <span className="whitespace-nowrap">Prefix: {result.report.static_tokens}t</span>
                  <span className="text-[#06b6d4] whitespace-nowrap">Breakpoints: {result.report.breakpoints_count || 1}/4</span>
                  <span className="whitespace-nowrap">Padded: {result.report.was_padded ? `+${result.report.padding_added}t` : 'No'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#0d121d] border border-[#1e2638] rounded-lg p-6 flex flex-col items-center justify-center text-center h-[348px] text-xs text-[#64748b]">
              <ArrowRight size={24} className="mb-2 text-[#334155]" />
              <span>Click "Run Cache Audit" to compile the prompt and inspect verified token boundaries.</span>
            </div>
          )}

          {error && (
            <div className="mt-2 p-2.5 rounded bg-red-950/40 border border-red-800 text-xs text-red-300">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
