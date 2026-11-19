import React, { useState } from 'react';
import { Play, Sparkles, Copy, Check, ArrowRight, ShieldCheck, GitCompare } from 'lucide-react';
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
    <div className="glass-panel p-6 sm:p-7">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-5 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-tight">Interactive Prompt Topology Optimizer & Sandbox</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Test any agent prompt to inspect volatile variable extraction, multi-tier breakpoints, and token boundary alignment
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <span className="text-xs font-medium text-slate-400 whitespace-nowrap mr-1">Presets:</span>
          <button
            onClick={() => setInputPrompt(PRESET_UNSTABLE)}
            className="px-3.5 py-1.5 text-xs rounded-xl bg-[#141b2c] hover:bg-[#1c263c] text-slate-200 border border-white/[0.08] shadow-sm active:scale-[0.98] transition-all whitespace-nowrap font-medium"
          >
            Volatile Preamble
          </button>
          <button
            onClick={() => setInputPrompt(PRESET_SUB_THRESHOLD)}
            className="px-3.5 py-1.5 text-xs rounded-xl bg-[#141b2c] hover:bg-[#1c263c] text-slate-200 border border-white/[0.08] shadow-sm active:scale-[0.98] transition-all whitespace-nowrap font-medium"
          >
            Sub-Threshold Padding
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Input Prompt */}
        <div>
          <div className="flex justify-between items-center mb-2 text-xs font-mono">
            <span className="text-slate-300 font-medium">Raw Inbound Prompt JSON</span>
            <span className="text-amber-400 font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Unstable Topologies Destabilize Cache
            </span>
          </div>
          <textarea
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            rows={14}
            className="w-full bg-[#090d17] border border-white/[0.08] rounded-xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/30 resize-none shadow-inner leading-relaxed"
            placeholder="Paste your JSON prompt payload here..."
          />
          <button
            onClick={handleAudit}
            disabled={loading}
            className="mt-3.5 w-full py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.25),0_4px_12px_rgba(59,130,246,0.35)] border border-blue-400/40 active:scale-[0.98] transition-all whitespace-nowrap"
          >
            <Play size={15} />
            <span>{loading ? 'Optimizing Topology...' : 'Run Cache Audit & Compile Invariants'}</span>
          </button>
        </div>

        {/* Right Column: Compiled Output */}
        <div>
          <div className="flex justify-between items-center mb-2 text-xs font-mono">
            <div className="flex items-center gap-2.5">
              <span className="text-slate-300 font-medium">Compiled Output</span>
              {result && (
                <div className="flex items-center gap-1 bg-[#141b2c] p-1 rounded-lg border border-white/[0.08]">
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2.5 py-0.5 text-xs rounded-md whitespace-nowrap transition ${
                      viewMode === 'json' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    JSON
                  </button>
                  <button
                    onClick={() => setViewMode('diff')}
                    className={`px-2.5 py-0.5 text-xs rounded-md flex items-center gap-1.5 whitespace-nowrap transition ${
                      viewMode === 'diff' ? 'bg-blue-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <GitCompare size={12} />
                    <span>Diff</span>
                  </button>
                </div>
              )}
            </div>

            {result && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 transition-all whitespace-nowrap"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
              </button>
            )}
          </div>

          {result ? (
            <div>
              {viewMode === 'json' ? (
                <pre className="w-full bg-[#090d17] border border-white/[0.08] rounded-xl p-4 text-xs font-mono text-emerald-400 overflow-auto h-[290px] shadow-inner leading-relaxed">
                  {JSON.stringify(JSON.parse(result.optimized_body), null, 2)}
                </pre>
              ) : (
                <div className="w-full bg-[#090d17] border border-white/[0.08] rounded-xl p-4 text-xs font-mono overflow-auto h-[290px] space-y-2.5 shadow-inner leading-relaxed">
                  <div className="text-xs text-slate-300 font-semibold border-b border-white/[0.06] pb-1.5">
                    Neutralized Dynamic Variables ({result.report.busters_detected.length} extracted):
                  </div>
                  {result.report.busters_detected.map((b, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-[#141b2c] border border-white/[0.06] shadow-sm">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-amber-400 font-bold">[{b.type}]</span>
                        <span className="text-slate-400 whitespace-nowrap">Relocated to Suffix</span>
                      </div>
                      <div className="text-red-400 line-through text-xs mt-1 break-all">
                        - {b.value}
                      </div>
                      <div className="text-emerald-400 text-xs mt-0.5 break-all font-semibold">
                        + {b.placeholder}
                      </div>
                    </div>
                  ))}
                  {result.report.was_padded && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium">
                      + [Smart Boundary Padding: +{result.report.padding_added} certified invariant tokens added to cross 1,024 threshold]
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Summary Pill */}
              <div className="mt-3.5 p-3.5 bg-[#090d17] border border-white/[0.08] rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-100 whitespace-nowrap">
                    Projected Hit: {Math.round(result.report.estimated_hit_rate * 100)}%
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-slate-300 font-mono text-xs">
                  <span className="whitespace-nowrap font-medium">Prefix: {result.report.static_tokens}t</span>
                  <span className="text-cyan-400 whitespace-nowrap font-semibold">Breakpoints: {result.report.breakpoints_count || 1}/4</span>
                  <span className="whitespace-nowrap font-medium">Padded: {result.report.was_padded ? `+${result.report.padding_added}t` : 'No'}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full bg-[#090d17] border border-white/[0.08] rounded-xl p-8 flex flex-col items-center justify-center text-center h-[348px] text-xs sm:text-sm text-slate-400 shadow-inner">
              <div className="p-3 rounded-full bg-white/[0.03] border border-white/[0.06] mb-3 text-slate-500">
                <ArrowRight size={22} />
              </div>
              <span className="max-w-xs leading-relaxed">
                Click "Run Cache Audit & Compile Invariants" to optimize this prompt and inspect token boundaries.
              </span>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3.5 rounded-xl bg-red-950/40 border border-red-800 text-xs text-red-300 shadow-sm">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
