import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral";
  highlight?: boolean;
  className?: string;
}

export default function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend,
  highlight,
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border p-5 transition-all duration-300 hover:border-white/20",
        highlight
          ? "bg-emerald-500/10 border-emerald-500/30"
          : "bg-white/5 border-white/10 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <p
            className={cn(
              "text-3xl font-black mt-1 tracking-tight",
              trend === "up"
                ? "text-green-400"
                : trend === "down"
                ? "text-red-400"
                : highlight
                ? "text-emerald-300"
                : "text-white"
            )}
          >
            {value}
          </p>
          {subValue && (
            <p className="text-gray-500 text-xs mt-1">{subValue}</p>
          )}
        </div>
        <div
          className={cn(
            "p-2.5 rounded-xl",
            highlight ? "bg-emerald-500/20" : "bg-white/10"
          )}
        >
          <Icon
            className={cn(
              "w-5 h-5",
              trend === "up"
                ? "text-green-400"
                : trend === "down"
                ? "text-red-400"
                : highlight
                ? "text-emerald-400"
                : "text-gray-400"
            )}
          />
        </div>
      </div>
    </div>
  );
}
