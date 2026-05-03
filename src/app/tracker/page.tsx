"use client";
import { useEffect, useState } from "react";
import { PerformanceMetrics, Recommendation } from "@/types";
import MetricCard from "@/components/dashboard/MetricCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  formatCurrency, formatPct, getReturnColor, formatMarketCap,
} from "@/lib/utils";
import {
  TrendingUp, TrendingDown, Award, Zap, Target, Activity,
  RefreshCw, Crosshair, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Cell,
} from "recharts";

export default function TrackerPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [positions, setPositions] = useState<Recommendation[]>([]);
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const res = await fetch("/api/tracker");
      if (res.ok) {
        const d = await res.json();
        setMetrics(d.metrics);
        setPositions(d.activePositions ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updatePrices() {
    setUpdating(true);
    try {
      await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-prices" }),
      });
      await loadData();
    } finally {
      setUpdating(false);
    }
  }

  // Chart data
  const returnsData = positions.map((p) => ({
    ticker: p.ticker,
    return: p.returnPct ?? 0,
  }));

  const scoreVsReturn = positions.map((p) => ({
    score: p.score,
    return: p.returnPct ?? 0,
    ticker: p.ticker,
  }));

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="h-8 w-64 bg-white/5 rounded animate-pulse mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-white/5 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Performance Tracker</h1>
          <p className="text-gray-400 mt-1">Real-time P&amp;L and accuracy metrics</p>
        </div>
        <Button onClick={updatePrices} disabled={updating} variant="outline">
          {updating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Update Prices
        </Button>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(0)}%`} icon={Award} trend={metrics.winRate >= 60 ? "up" : "neutral"} highlight={metrics.winRate >= 60} />
          <MetricCard label="Avg Return" value={formatPct(metrics.avgReturn)} icon={TrendingUp} trend={metrics.avgReturn >= 0 ? "up" : "down"} />
          <MetricCard label="Best Return" value={formatPct(metrics.bestReturn)} icon={Zap} trend="up" />
          <MetricCard label="Worst Return" value={formatPct(metrics.worstReturn)} icon={TrendingDown} trend="down" />
          <MetricCard label="Total Picks" value={String(metrics.totalRecommendations)} icon={Crosshair} subValue={`${metrics.activeRecommendations} active`} />
          <MetricCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} icon={Activity} trend={metrics.sharpeRatio >= 1 ? "up" : "neutral"} />
        </div>
      )}

      {/* Win/Loss Summary */}
      {metrics && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5 text-center">
            <p className="text-green-400 text-4xl font-black">{metrics.winners}</p>
            <p className="text-green-400/70 text-sm mt-1">Winners</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5 text-center">
            <p className="text-red-400 text-4xl font-black">{metrics.losers}</p>
            <p className="text-red-400/70 text-sm mt-1">Losers</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 text-center">
            <p className="text-emerald-400 text-4xl font-black">{metrics.tenXCandidates}</p>
            <p className="text-emerald-400/70 text-sm mt-1">10X Targets</p>
          </div>
        </div>
      )}

      {/* Returns Chart */}
      {returnsData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Returns by Position</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={returnsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="ticker" stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fill: "#9ca3af", fontSize: 12 }} tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ background: "#111", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  formatter={(val: unknown) => [`${Number(val).toFixed(2)}%`, "Return"]}
                />
                <Bar dataKey="return" radius={[4, 4, 0, 0]}>
                  {returnsData.map((entry, i) => (
                    <Cell key={i} fill={entry.return >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Active Positions Table */}
      {positions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Positions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left text-gray-500 text-xs font-semibold uppercase px-6 py-3">Ticker</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase px-4 py-3">Entry</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase px-4 py-3">Current</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase px-4 py-3">Target</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase px-4 py-3">P&amp;L</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase px-4 py-3">Score</th>
                    <th className="text-right text-gray-500 text-xs font-semibold uppercase px-4 py-3">Upside</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {positions.map((pos) => {
                    const returnPct = pos.returnPct ?? 0;
                    const upside = ((pos.targetPrice - (pos.currentPrice ?? pos.entryPrice)) / (pos.currentPrice ?? pos.entryPrice)) * 100;
                    return (
                      <tr key={pos.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <span className="text-white font-bold">{pos.ticker}</span>
                            <p className="text-gray-500 text-xs">{pos.sector}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right text-gray-300">{formatCurrency(pos.entryPrice)}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={getReturnColor(returnPct)}>
                            {formatCurrency(pos.currentPrice ?? pos.entryPrice)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-emerald-400">{formatCurrency(pos.targetPrice)}</td>
                        <td className="px-4 py-4 text-right">
                          <span className={`font-bold ${getReturnColor(returnPct)}`}>
                            {returnPct >= 0 ? "+" : ""}{returnPct.toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <Badge variant={pos.score >= 75 ? "success" : pos.score >= 60 ? "warning" : "info"}>
                            {pos.score.toFixed(0)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right text-yellow-400 font-semibold">
                          +{upside.toFixed(0)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {positions.length === 0 && !loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-16 text-center">
          <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">No active positions</h3>
          <p className="text-gray-500">Run a weekly scan to generate recommendations to track.</p>
        </div>
      )}
    </div>
  );
}
