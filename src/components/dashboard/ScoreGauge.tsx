"use client";
import { ScoreBreakdown } from "@/types";
import { getScoreColor } from "@/lib/utils";

interface ScoreGaugeProps {
  breakdown: ScoreBreakdown;
  size?: "sm" | "md" | "lg";
}

export default function ScoreGauge({ breakdown, size = "md" }: ScoreGaugeProps) {
  const { total, momentum, fundamental, technical, catalyst, riskReward } = breakdown;

  const bars = [
    { label: "Momentum", value: momentum, max: 25, color: "bg-blue-500" },
    { label: "Fundamentals", value: fundamental, max: 25, color: "bg-purple-500" },
    { label: "Technical", value: technical, max: 20, color: "bg-emerald-500" },
    { label: "Catalyst", value: catalyst, max: 20, color: "bg-yellow-500" },
    { label: "Risk/Reward", value: riskReward, max: 10, color: "bg-orange-500" },
  ];

  const scoreColor = getScoreColor(total);
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - (total / 100) * circumference;

  return (
    <div className={`flex flex-col ${size === "sm" ? "gap-2" : "gap-3"}`}>
      {/* Circular gauge */}
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg width={size === "sm" ? 80 : 100} height={size === "sm" ? 80 : 100} className="-rotate-90">
            <circle
              cx={size === "sm" ? 40 : 50}
              cy={size === "sm" ? 40 : 50}
              r={size === "sm" ? 32 : 40}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx={size === "sm" ? 40 : 50}
              cy={size === "sm" ? 40 : 50}
              r={size === "sm" ? 32 : 40}
              fill="none"
              stroke={total >= 75 ? "#22c55e" : total >= 60 ? "#eab308" : total >= 45 ? "#f97316" : "#ef4444"}
              strokeWidth="8"
              strokeDasharray={2 * Math.PI * (size === "sm" ? 32 : 40)}
              strokeDashoffset={2 * Math.PI * (size === "sm" ? 32 : 40) - (total / 100) * 2 * Math.PI * (size === "sm" ? 32 : 40)}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold ${scoreColor} ${size === "sm" ? "text-lg" : "text-2xl"}`}>
              {total.toFixed(0)}
            </span>
            <span className="text-gray-500 text-xs">/100</span>
          </div>
        </div>
      </div>

      {/* Score breakdown bars */}
      {size !== "sm" && (
        <div className="space-y-1.5">
          {bars.map((bar) => (
            <div key={bar.label} className="flex items-center gap-2">
              <span className="text-gray-500 text-xs w-24 truncate">{bar.label}</span>
              <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`h-full ${bar.color} rounded-full transition-all duration-500`}
                  style={{ width: `${(bar.value / bar.max) * 100}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 w-8 text-right">
                {bar.value}/{bar.max}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
