"use client";
import { useEffect, useRef, useState } from "react";
import { PerformanceMetrics, Recommendation } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import RecommendationCard from "@/components/stocks/RecommendationCard";
import { Button } from "@/components/ui/button";
import { formatPct } from "@/lib/utils";
import {
  TrendingUp, Target, Zap, Award, BarChart3,
  RefreshCw, Crosshair, ChevronRight, Activity, Globe,
} from "lucide-react";
import Link from "next/link";

const HOW_IT_WORKS = [
  { icon: "🔍", title: "Universe Scan",   desc: "Screens 10,000+ US-listed stocks — every NYSE and NASDAQ ticker — for momentum and setup quality." },
  { icon: "📊", title: "5-Factor Score",  desc: "Each stock scored on momentum, fundamentals, technicals, catalysts, and risk/reward (0–100)." },
  { icon: "🤖", title: "AI Deep Dive",    desc: "Claude AI analyzes top picks like a hedge fund analyst — bull case, bear case, catalysts, verdict." },
  { icon: "🎯", title: "Precise Targets", desc: "Entry price, profit target, and stop-loss calculated for each recommendation." },
  { icon: "📈", title: "Live Tracker",    desc: "Every pick tracked in real-time. Win rate, returns, and accuracy continuously measured." },
];

interface FullScanState {
  phase: "idle" | "starting" | "stage1" | "finalizing" | "done" | "error";
  jobId: string | null;
  totalTickers: number;
  totalChunks: number;
  processed: number;
  passedStage1: number;
  currentChunk: number;
  errorMsg: string | null;
  topPicks: string[];
}
const INITIAL_SCAN: FullScanState = {
  phase: "idle", jobId: null, totalTickers: 0, totalChunks: 0,
  processed: 0, passedStage1: 0, currentChunk: 0, errorMsg: null, topPicks: [],
};

export default function Dashboard() {
  const [metrics,    setMetrics]    = useState<PerformanceMetrics | null>(null);
  const [activeRecs, setActiveRecs] = useState<Recommendation[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [quickScan,  setQuickScan]  = useState<"idle"|"running"|"done"|"error">("idle");
  const [quickResult,setQuickResult]= useState<{ saved: number; topPicks: string[]; scanned: number } | null>(null);
  const [fullScan,   setFullScan]   = useState<FullScanState>(INITIAL_SCAN);
  const fullScanRef = useRef<FullScanState>(INITIAL_SCAN);
  useEffect(() => { fullScanRef.current = fullScan; }, [fullScan]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [t, r] = await Promise.all([
        fetch("/api/tracker"),
        fetch("/api/recommendations?status=active"),
      ]);
      if (t.ok) { const d = await t.json(); setMetrics(d.metrics); }
      if (r.ok) { const d = await r.json(); setActiveRecs(d.recommendations?.slice(0, 3) ?? []); }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ── Quick Rescan (80 curated tickers, live prices, ~60-90s) ─────────────────
  async function runQuickScan() {
    setQuickScan("running");
    setQuickResult(null);
    try {
      const res = await fetch("/api/rescan", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setQuickResult(data);
      setQuickScan("done");
      await loadData();
    } catch (err) {
      console.error(err);
      setQuickScan("error");
    }
  }

  // ── Full Market Scan (10,000+ tickers, chunked) ───────────────────────────
  async function runFullMarketScan() {
    setFullScan({ ...INITIAL_SCAN, phase: "starting" });
    try {
      const startRes = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!startRes.ok) throw new Error(await startRes.text());
      const { jobId, totalTickers, totalChunks } = await startRes.json();
      setFullScan((s) => ({ ...s, phase: "stage1", jobId, totalTickers, totalChunks }));

      for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
        if (fullScanRef.current.phase === "idle") break;
        try {
          const res = await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "chunk", jobId, chunkIndex }),
          });
          if (res.ok) {
            const data = await res.json();
            setFullScan((s) => ({
              ...s,
              currentChunk:  chunkIndex + 1,
              processed:     data.processed    ?? s.processed,
              passedStage1:  data.passedStage1 ?? s.passedStage1,
            }));
          }
        } catch { /* skip failed chunks */ }
      }

      setFullScan((s) => ({ ...s, phase: "finalizing" }));
      const finalRes = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "finalize", jobId }),
      });
      const finalData = await finalRes.json();
      setFullScan((s) => ({ ...s, phase: "done", topPicks: finalData.topPicks ?? [] }));
      await loadData();
    } catch (err) {
      setFullScan((s) => ({ ...s, phase: "error", errorMsg: String(err) }));
    }
  }

  const isQuickRunning = quickScan === "running";
  const isFullRunning  = fullScan.phase === "starting" || fullScan.phase === "stage1" || fullScan.phase === "finalizing";
  const isAnyScanning  = isQuickRunning || isFullRunning;
  const fullPct        = fullScan.totalChunks > 0
    ? Math.round((fullScan.currentChunk / fullScan.totalChunks) * 100) : 0;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-blue-900/10" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-emerald-500/5 blur-[100px] rounded-full" />

        <div className="relative max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1 text-emerald-400 text-xs font-semibold mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                HEDGE FUND GRADE ANALYSIS — LIVE MAY 2026 DATA
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="text-white">Find the Next</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                  10X Stock
                </span>
              </h1>
              <p className="text-gray-400 mt-3 text-lg max-w-xl">
                AI-powered weekly picks using real-time prices, momentum, fundamentals, and catalyst analysis — the way top hedge funds identify explosive growth.
              </p>
            </div>

            <div className="flex flex-col gap-3 min-w-[220px]">
              {/* Primary: Quick Rescan */}
              <Button
                onClick={runQuickScan}
                disabled={isAnyScanning}
                size="lg"
                className="w-full"
              >
                {isQuickRunning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Scanning 80 stocks...</>
                ) : (
                  <><Crosshair className="w-4 h-4" />Quick Rescan (Live Prices)</>
                )}
              </Button>

              {/* Secondary: Full 10k scan */}
              <Button
                onClick={runFullMarketScan}
                disabled={isAnyScanning}
                variant="outline"
                size="lg"
                className="w-full"
              >
                {isFullRunning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Full scan running...</>
                ) : (
                  <><Globe className="w-4 h-4" />Full Market Scan (10k+)</>
                )}
              </Button>

              <Link href="/analysis">
                <Button variant="outline" size="lg" className="w-full">
                  <BarChart3 className="w-4 h-4" />Analyze a Stock
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick scan running indicator */}
          {isQuickRunning && (
            <div className="mt-6 bg-black/40 border border-emerald-500/30 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin flex-shrink-0" />
                <div>
                  <p className="text-emerald-400 text-sm font-semibold">Scanning 80 high-potential stocks with live prices...</p>
                  <p className="text-gray-500 text-xs mt-0.5">Fetching live data → scoring → AI analysis → saving top 5 picks. Takes ~60-90 seconds.</p>
                </div>
              </div>
              <div className="mt-3 w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full animate-pulse" style={{ width: "100%" }} />
              </div>
            </div>
          )}

          {/* Quick scan result */}
          {quickScan === "done" && quickResult && (
            <div className="mt-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-emerald-400 font-semibold text-sm">New picks live — fresh data as of today</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  Scanned {quickResult.scanned} stocks → saved {quickResult.saved} new picks
                  {quickResult.topPicks.length > 0 && <> — Top: <span className="text-emerald-300 font-medium">{quickResult.topPicks.join(", ")}</span></>}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setQuickScan("idle")}>Dismiss</Button>
            </div>
          )}

          {quickScan === "error" && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
              <p className="text-red-400 text-sm">Rescan failed. Check network and try again.</p>
              <Button variant="outline" size="sm" onClick={() => setQuickScan("idle")}>Dismiss</Button>
            </div>
          )}

          {/* Full market scan progress */}
          {isFullRunning && (
            <div className="mt-6 bg-black/40 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-400 text-sm font-semibold">
                  {fullScan.phase === "starting"   && "Fetching full US ticker universe..."}
                  {fullScan.phase === "stage1"     && `Stage 1: ${fullScan.processed.toLocaleString()} / ${fullScan.totalTickers.toLocaleString()} tickers screened`}
                  {fullScan.phase === "finalizing" && `Stage 2: Scoring ${fullScan.passedStage1.toLocaleString()} survivors + AI analysis...`}
                </span>
                {fullScan.phase === "stage1" && (
                  <span className="text-gray-400 text-xs">{fullPct}%</span>
                )}
              </div>
              {fullScan.phase === "stage1" && (
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-300 rounded-full transition-all duration-300"
                    style={{ width: `${fullPct}%` }}
                  />
                </div>
              )}
              <div className="flex gap-6 mt-2 text-xs text-gray-500">
                {fullScan.phase === "stage1" && (
                  <>
                    <span>Batch {fullScan.currentChunk} / {fullScan.totalChunks}</span>
                    <span className="text-emerald-400/70">{fullScan.passedStage1.toLocaleString()} passed filters</span>
                  </>
                )}
              </div>
            </div>
          )}

          {fullScan.phase === "done" && (
            <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-blue-400 font-semibold text-sm">Full market scan complete!</p>
                <p className="text-gray-400 text-xs mt-0.5">
                  {fullScan.totalTickers.toLocaleString()} tickers → {fullScan.passedStage1.toLocaleString()} passed filters → top picks saved.
                  {fullScan.topPicks.length > 0 && <> Best: <span className="text-blue-300 font-medium">{fullScan.topPicks.slice(0, 5).join(", ")}</span></>}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setFullScan(INITIAL_SCAN)}>Dismiss</Button>
            </div>
          )}
          {fullScan.phase === "error" && (
            <div className="mt-6 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center justify-between">
              <p className="text-red-400 text-sm">Full scan error: {fullScan.errorMsg}</p>
              <Button variant="outline" size="sm" onClick={() => setFullScan(INITIAL_SCAN)}>Dismiss</Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metrics */}
        {metrics && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Portfolio Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Win Rate"     value={`${metrics.winRate.toFixed(0)}%`}       icon={Award}     trend={metrics.winRate >= 60 ? "up" : metrics.winRate >= 40 ? "neutral" : "down"} highlight={metrics.winRate >= 60} />
              <MetricCard label="Avg Return"   value={formatPct(metrics.avgReturn)}             icon={TrendingUp} trend={metrics.avgReturn >= 0 ? "up" : "down"} />
              <MetricCard label="Best Return"  value={formatPct(metrics.bestReturn)}             icon={Zap}       trend="up" />
              <MetricCard label="Active Picks" value={String(metrics.activeRecommendations)}    icon={Crosshair} subValue={`${metrics.totalRecommendations} total`} />
              <MetricCard label="10X Targets"  value={String(metrics.tenXCandidates)}           icon={Target}    highlight={metrics.tenXCandidates > 0} />
              <MetricCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)}           icon={Activity}  trend={metrics.sharpeRatio >= 1 ? "up" : "neutral"} />
            </div>
          </section>
        )}

        {/* Active Picks */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Latest Top Picks</h2>
            <Link href="/recommendations" className="text-emerald-400 text-sm hover:text-emerald-300 flex items-center gap-1">
              All picks <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map((i) => <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : activeRecs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRecs.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <Crosshair className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">No active picks yet</h3>
              <p className="text-gray-500 text-sm mb-6">
                Run a Quick Rescan to generate fresh picks with live May 2026 prices — takes about 60 seconds.
              </p>
              <Button onClick={runQuickScan} disabled={isAnyScanning}>
                <Crosshair className="w-4 h-4" />
                {isQuickRunning ? "Scanning..." : "Quick Rescan (Live Prices)"}
              </Button>
            </div>
          )}
        </section>

        {/* How It Works */}
        <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {HOW_IT_WORKS.map((step, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="text-2xl mb-2">{step.icon}</div>
              <h3 className="text-white font-semibold text-sm mb-1">{step.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </section>

        <div className="text-center py-4">
          <p className="text-gray-600 text-xs max-w-2xl mx-auto">
            For educational and research purposes only. Not financial advice. All investments carry risk. Past performance does not guarantee future results.
          </p>
        </div>
      </div>
    </div>
  );
}
