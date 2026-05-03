"use client";
import { Recommendation } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ScoreGauge from "@/components/dashboard/ScoreGauge";
import {
  formatCurrency,
  formatPct,
  formatMarketCap,
  getReturnColor,
  getScoreColor,
} from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Shield,
  Clock,
  ChevronRight,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";

interface RecommendationCardProps {
  rec: Recommendation;
  onClose?: (id: string, price: number) => void;
}

export default function RecommendationCard({ rec, onClose }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closePrice, setClosePrice] = useState("");

  const returnPct = rec.returnPct ?? 0;
  const isPositive = returnPct >= 0;
  const upside = ((rec.targetPrice - rec.entryPrice) / rec.entryPrice) * 100;
  const currentPrice = rec.currentPrice ?? rec.entryPrice;

  const aiData = rec.aiAnalysis ? (() => {
    try { return JSON.parse(rec.aiAnalysis!); } catch { return null; }
  })() : null;

  const handleClose = () => {
    const price = parseFloat(closePrice);
    if (isNaN(price) || price <= 0) return;
    onClose?.(rec.id, price);
    setClosing(false);
  };

  return (
    <Card className="group hover:border-white/20 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-2xl font-black tracking-tight">{rec.ticker}</CardTitle>
              <Badge variant={rec.score >= 75 ? "success" : rec.score >= 60 ? "warning" : "info"}>
                Score: {rec.score.toFixed(0)}
              </Badge>
              <Badge variant={rec.status === "active" ? "success" : rec.status === "closed" ? "secondary" : "danger"}>
                {rec.status.toUpperCase()}
              </Badge>
              {rec.sector && <Badge variant="outline">{rec.sector}</Badge>}
            </div>
            <p className="text-gray-400 text-sm mt-0.5">{rec.name}</p>
            <p className="text-gray-600 text-xs mt-0.5">
              Week of {format(new Date(rec.weekOf), "MMM d, yyyy")}
            </p>
          </div>
          <ScoreGauge breakdown={rec.scoreBreakdown} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price grid */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <p className="text-gray-500 text-xs">Entry</p>
            <p className="text-white font-semibold text-sm">{formatCurrency(rec.entryPrice)}</p>
          </div>
          <div className="bg-white/5 rounded-lg p-2.5 text-center">
            <p className="text-gray-500 text-xs">Current</p>
            <p className={`font-semibold text-sm ${getReturnColor(returnPct)}`}>
              {formatCurrency(currentPrice)}
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 text-center">
            <p className="text-emerald-400 text-xs flex items-center justify-center gap-1">
              <Target className="w-3 h-3" /> Target
            </p>
            <p className="text-emerald-400 font-bold text-sm">{formatCurrency(rec.targetPrice)}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2.5 text-center">
            <p className="text-red-400 text-xs flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Stop
            </p>
            <p className="text-red-400 font-semibold text-sm">{formatCurrency(rec.stopLoss)}</p>
          </div>
        </div>

        {/* Return & Upside */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="w-4 h-4 text-green-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
            <span className={`font-bold text-lg ${getReturnColor(returnPct)}`}>
              {formatPct(returnPct)}
            </span>
            <span className="text-gray-500 text-sm">return</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 font-semibold">{formatPct(upside)}</span>
            <span className="text-gray-500 text-sm">upside to target</span>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500 text-xs">{rec.timeframe}</span>
          </div>
        </div>

        {/* Thesis */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <p className="text-blue-300 text-xs font-semibold mb-1 uppercase tracking-wider">Investment Thesis</p>
          <p className="text-gray-300 text-sm leading-relaxed">{rec.thesis}</p>
        </div>

        {/* Catalysts & Risks */}
        {expanded && (
          <div className="space-y-3 animate-in slide-in-from-top-2">
            {rec.catalysts.length > 0 && (
              <div>
                <p className="text-green-400 text-xs font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Catalysts
                </p>
                <ul className="space-y-1">
                  {rec.catalysts.map((c, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-green-500 mt-1">•</span> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {rec.risks.length > 0 && (
              <div>
                <p className="text-red-400 text-xs font-semibold mb-2 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Risks
                </p>
                <ul className="space-y-1">
                  {rec.risks.map((r, i) => (
                    <li key={i} className="text-gray-300 text-sm flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {aiData && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                <p className="text-purple-300 text-xs font-semibold mb-2 uppercase tracking-wider">AI Verdict</p>
                <p className="text-gray-300 text-sm">{aiData.verdict}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={
                    aiData.confidenceLevel === "HIGH" ? "success" :
                    aiData.confidenceLevel === "MEDIUM" ? "warning" : "danger"
                  }>
                    {aiData.confidenceLevel} CONFIDENCE
                  </Badge>
                  <span className="text-gray-500 text-xs">{aiData.timeframe}</span>
                </div>
              </div>
            )}

            {/* Close position */}
            {rec.status === "active" && onClose && (
              <div className="border border-white/10 rounded-lg p-3">
                {closing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Close price ($)"
                      value={closePrice}
                      onChange={(e) => setClosePrice(e.target.value)}
                      className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                    />
                    <Button size="sm" onClick={handleClose}>Confirm</Button>
                    <Button size="sm" variant="ghost" onClick={() => setClosing(false)}>Cancel</Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setClosing(true)}>
                    Close Position
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 text-gray-500 hover:text-gray-300 text-xs py-1 transition-colors"
        >
          {expanded ? "Show less" : "Full analysis"}
          <ChevronRight className={`w-3 h-3 transition-transform ${expanded ? "rotate-90" : ""}`} />
        </button>
      </CardContent>
    </Card>
  );
}
