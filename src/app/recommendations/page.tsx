"use client";
import { useEffect, useState } from "react";
import { Recommendation } from "@/types";
import RecommendationCard from "@/components/stocks/RecommendationCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Crosshair, Filter } from "lucide-react";

type StatusFilter = "all" | "active" | "closed" | "stopped";

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadRecs(); }, [filter]);

  async function loadRecs() {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/recommendations" : `/api/recommendations?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setRecs(d.recommendations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function runScan() {
    setScanning(true);
    try {
      await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scan" }),
      });
      setFilter("active");
      await loadRecs();
    } finally {
      setScanning(false);
    }
  }

  async function closePosition(id: string, price: number) {
    await fetch("/api/tracker", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", id, closedPrice: price }),
    });
    await loadRecs();
  }

  const filters: { label: string; value: StatusFilter }[] = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Closed", value: "closed" },
    { label: "Stopped", value: "stopped" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Weekly Picks</h1>
          <p className="text-gray-400 mt-1">
            {recs.length} recommendation{recs.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === f.value
                    ? "bg-emerald-500 text-black"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
            {scanning ? "Scanning..." : "New Scan"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-72 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : recs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {recs.map((rec) => (
            <RecommendationCard key={rec.id} rec={rec} onClose={closePosition} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-16 text-center">
          <Crosshair className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">No recommendations yet</h3>
          <p className="text-gray-500 mb-6">Run a weekly scan to generate AI-powered 10x picks.</p>
          <Button onClick={runScan} disabled={scanning} size="lg">
            <Crosshair className="w-4 h-4" /> Run Weekly Scan
          </Button>
        </div>
      )}
    </div>
  );
}
