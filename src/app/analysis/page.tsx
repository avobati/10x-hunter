"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ScoreGauge from "@/components/dashboard/ScoreGauge";
import { formatCurrency, formatPct, formatMarketCap, getReturnColor } from "@/lib/utils";
import { Search, TrendingUp, TrendingDown, Target, Shield, Zap, AlertTriangle, BarChart3 } from "lucide-react";
import { SCAN_UNIVERSE } from "@/lib/universe";

interface AnalysisResult {
  ticker: string;
  name: string;
  price: number;
  score: {
    momentum: number;
    fundamental: number;
    technical: number;
    catalyst: number;
    riskReward: number;
    total: number;
  };
  targetPrice: number;
  stopLoss: number;
  thesis: string;
  aiAnalysis: {
    summary: string;
    bullCase: string;
    bearCase: string;
    catalysts: string[];
    risks: string[];
    verdict: string;
    confidenceLevel: string;
    timeframe: string;
  };
  data: {
    rsi: number;
    macd: number;
    priceChange1m: number;
    priceChange3m: number;
    marketCap: number;
    volume: number;
    sma50: number;
    sma200: number;
  };
}

export default function AnalysisPage() {
  const [ticker, setTicker] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function analyze() {
    if (!ticker.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker: ticker.trim().toUpperCase() }),
      });

      if (!res.ok) {
        const d = await res.json();
        setError(d.error ?? "Analysis failed");
        return;
      }

      const d = await res.json();
      setResult(d);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  const upside = result ? ((result.targetPrice - result.price) / result.price) * 100 : 0;
  const downside = result ? ((result.stopLoss - result.price) / result.price) * 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white">Stock Analyzer</h1>
        <p className="text-gray-400 mt-1">Run a full hedge fund quality deep-dive on any stock</p>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Enter ticker (e.g. NVDA, IONQ, SOUN)"
            value={ticker}
            onChange={(e) => setTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
            className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
        <Button onClick={analyze} disabled={loading || !ticker} size="lg">
          {loading ? "Analyzing..." : "Analyze"}
        </Button>
      </div>

      {/* Quick-pick universe */}
      <div className="flex flex-wrap gap-2">
        {SCAN_UNIVERSE.slice(0, 12).map((s) => (
          <button
            key={s.ticker}
            onClick={() => { setTicker(s.ticker); }}
            className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:border-white/20 text-xs transition-all"
          >
            {s.ticker}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <div className="w-12 h-12 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Running hedge fund analysis...</p>
          <p className="text-gray-600 text-xs mt-1">Fetching live data + AI analysis</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in slide-in-from-top-2">
          {/* Header */}
          <div className="flex items-start gap-6 bg-white/5 border border-white/10 rounded-xl p-6">
            <ScoreGauge breakdown={result.score} size="lg" />
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-3xl font-black">{result.ticker}</h2>
                <Badge variant={result.score.total >= 75 ? "success" : result.score.total >= 60 ? "warning" : "info"}>
                  Score: {result.score.total.toFixed(0)}/100
                </Badge>
                <Badge variant={
                  result.aiAnalysis.confidenceLevel === "HIGH" ? "success" :
                  result.aiAnalysis.confidenceLevel === "MEDIUM" ? "warning" : "danger"
                }>
                  {result.aiAnalysis.confidenceLevel} CONFIDENCE
                </Badge>
              </div>
              <p className="text-gray-400 mt-1">{result.name}</p>
              <p className="text-white font-bold text-2xl mt-2">{formatCurrency(result.price)}</p>
              <p className="text-gray-400 text-sm mt-3">{result.aiAnalysis.summary}</p>
            </div>
          </div>

          {/* Price Targets */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
              <p className="text-gray-500 text-xs mb-1">Entry Price</p>
              <p className="text-white font-bold text-xl">{formatCurrency(result.price)}</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-emerald-400 text-xs mb-1 flex items-center justify-center gap-1"><Target className="w-3 h-3" /> Price Target</p>
              <p className="text-emerald-400 font-black text-2xl">{formatCurrency(result.targetPrice)}</p>
              <p className="text-emerald-600 text-xs mt-1">+{upside.toFixed(0)}% upside</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
              <p className="text-red-400 text-xs mb-1 flex items-center justify-center gap-1"><Shield className="w-3 h-3" /> Stop Loss</p>
              <p className="text-red-400 font-bold text-xl">{formatCurrency(result.stopLoss)}</p>
              <p className="text-red-600 text-xs mt-1">{downside.toFixed(0)}% risk</p>
            </div>
          </div>

          {/* Technical Data */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "RSI(14)", value: result.data.rsi?.toFixed(1) ?? "N/A", good: result.data.rsi >= 55 && result.data.rsi <= 80 },
              { label: "1M Change", value: `${result.data.priceChange1m?.toFixed(1) ?? 0}%`, good: (result.data.priceChange1m ?? 0) > 0 },
              { label: "3M Change", value: `${result.data.priceChange3m?.toFixed(1) ?? 0}%`, good: (result.data.priceChange3m ?? 0) > 0 },
              { label: "Market Cap", value: formatMarketCap(result.data.marketCap), good: true },
            ].map((item) => (
              <div key={item.label} className="bg-white/5 border border-white/10 rounded-lg p-3">
                <p className="text-gray-500 text-xs">{item.label}</p>
                <p className={`font-bold mt-0.5 ${item.good ? "text-white" : "text-red-400"}`}>{item.value}</p>
              </div>
            ))}
          </div>

          {/* Bull / Bear */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-5">
              <p className="text-green-400 font-semibold text-sm mb-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Bull Case</p>
              <p className="text-gray-300 text-sm leading-relaxed">{result.aiAnalysis.bullCase}</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-5">
              <p className="text-red-400 font-semibold text-sm mb-2 flex items-center gap-2"><TrendingDown className="w-4 h-4" /> Bear Case</p>
              <p className="text-gray-300 text-sm leading-relaxed">{result.aiAnalysis.bearCase}</p>
            </div>
          </div>

          {/* Catalysts + Risks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-green-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> Key Catalysts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.aiAnalysis.catalysts.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-green-500 mt-0.5 font-bold">↑</span> {c}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Key Risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {result.aiAnalysis.risks.map((r, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                      <span className="text-red-500 mt-0.5 font-bold">↓</span> {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Verdict */}
          <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
            <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider mb-2">AI Verdict</p>
            <p className="text-white text-lg font-semibold">{result.aiAnalysis.verdict}</p>
            <div className="flex items-center gap-3 mt-3">
              <Badge variant="info">⏱ {result.aiAnalysis.timeframe}</Badge>
              <Badge variant={result.score.total >= 75 ? "gold" : "outline"}>
                {result.score.total >= 75 ? "🎯 Top Pick Candidate" : result.score.total >= 60 ? "👀 Watch Closely" : "⚠️ Below Threshold"}
              </Badge>
            </div>
          </div>

          <p className="text-gray-600 text-xs text-center">
            For educational purposes only. Not financial advice. All investments carry risk.
          </p>
        </div>
      )}
    </div>
  );
}
