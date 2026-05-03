"use client";
import { useEffect, useState } from "react";
import { PerformanceMetrics, Recommendation } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import RecommendationCard from "@/components/stocks/RecommendationCard";
import { Button } from "@/components/ui/button";
import { formatPct } from "@/lib/utils";
import {
  TrendingUp, Target, Zap, Award, BarChart3,
  RefreshCw, Crosshair, ChevronRight, Activity,
} from "lucide-react";
import Link from "next/link";

const SCAN_UNIVERSE_COUNT = 40;

const HOW_IT_WORKS = [
  { icon: "🔍", title: "Universe Scan", desc: "Screens 40+ high-potential micro and small-cap stocks weekly for momentum and setup quality." },
  { icon: "📊", title: "5-Factor Scoring", desc: "Each stock scored on momentum, fundamentals, technicals, catalysts, and risk/reward." },
  { icon: "🤖", title: "AI Deep Dive", desc: "Claude analyzes top picks like a hedge fund analyst — bull case, bear case, catalysts." },
  { icon: "🎯", title: "Precise Targets", desc: "Entry price, profit target, and stop-loss calculated for each recommendation." },
  { icon: "📈", title: "Performance Track", desc: "Every pick tracked in real-time. Win rates, returns, and accuracy continuously measured." },
];

export default function Dashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [activeRecs, setActiveRecs] = useState<Recommendation[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastScan, setLastScan] = useState<string | null>(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [trackerRes, recsRes] = await Promise.all([
        fetch("/api/tracker"),
        fetch("/api/recommendations?status=active"),
      ]);
      if (trackerRes.ok) {
        const d = await trackerRes.json();
        setMetrics(d.metrics);
      }
      if (recsRes.ok) {
        const d = await recsRes.json();
        setActiveRecs(d.recommendations?.slice(0, 3) ?? []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      if (res.ok) {
        await loadData();
        setLastScan(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setScanning(false);
    }
  }

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
                HEDGE FUND GRADE ANALYSIS
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">
                <span className="text-white">Find the Next</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-emerald-200">
                  10X Stock
                </span>
              </h1>
              <p className="text-gray-400 mt-3 text-lg max-w-xl">
                AI-powered weekly picks using momentum, fundamentals, and catalyst analysis — the way top hedge funds identify explosive growth.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={runScan} disabled={scanning} size="lg" className="min-w-[180px]">
                {scanning ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" />Scanning {SCAN_UNIVERSE_COUNT} stocks...</>
                ) : (
                  <><Crosshair className="w-4 h-4" />Run Weekly Scan</>
                )}
              </Button>
              <Link href="/analysis">
                <Button variant="outline" size="lg">
                  <BarChart3 className="w-4 h-4" />Analyze Stock
                </Button>
              </Link>
            </div>
          </div>
          {lastScan && <p className="text-gray-500 text-xs mt-4">Last scan: {lastScan}</p>}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Metrics */}
        {metrics && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Portfolio Performance</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(0)}%`} icon={Award} trend={metrics.winRate >= 60 ? "up" : metrics.winRate >= 40 ? "neutral" : "down"} highlight={metrics.winRate >= 60} />
              <MetricCard label="Avg Return" value={formatPct(metrics.avgReturn)} icon={TrendingUp} trend={metrics.avgReturn >= 0 ? "up" : "down"} />
              <MetricCard label="Best Return" value={formatPct(metrics.bestReturn)} icon={Zap} trend="up" />
              <MetricCard label="Active Picks" value={String(metrics.activeRecommendations)} icon={Crosshair} subValue={`${metrics.totalRecommendations} total`} />
              <MetricCard label="10X Targets" value={String(metrics.tenXCandidates)} icon={Target} highlight={metrics.tenXCandidates > 0} />
              <MetricCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} icon={Activity} trend={metrics.sharpeRatio >= 1 ? "up" : "neutral"} />
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
              {[1, 2, 3].map((i) => <div key={i} className="h-64 rounded-xl bg-white/5 animate-pulse" />)}
            </div>
          ) : activeRecs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeRecs.map((rec) => <RecommendationCard key={rec.id} rec={rec} />)}
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
              <Crosshair className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h3 className="text-white font-semibold mb-2">No active picks yet</h3>
              <p className="text-gray-500 text-sm mb-6">Run a weekly scan to identify the best 10x opportunities across {SCAN_UNIVERSE_COUNT} stocks.</p>
              <Button onClick={runScan} disabled={scanning}>
                <Crosshair className="w-4 h-4" />Run First Scan
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
