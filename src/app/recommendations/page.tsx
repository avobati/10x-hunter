"use client";
import { useEffect, useState } from "react";
import { Recommendation } from "@/types";
import RecommendationCard from "@/components/stocks/RecommendationCard";
import { Button } from "@/components/ui/button";
import { RefreshCw, Crosshair, Globe } from "lucide-react";

type StatusFilter = "all" | "active" | "closed" | "stopped";

export default function RecommendationsPage() {
  const [recs,     setRecs]     = useState<Recommendation[]>([]);
  const [filter,   setFilter]   = useState<StatusFilter>("active");
  const [scanning, setScanning] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [scanMsg,  setScanMsg]  = useState("");

  useEffect(() => { loadRecs(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh prices on mount
  useEffect(() => {
    refreshPrices();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadRecs() {
    setLoading(true);
    try {
      const url = filter === "all"
        ? "/api/recommendations"
        : `/api/recommendations?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const d = await res.json();
        setRecs(d.recommendations ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function refreshPrices() {
    try {
      await fetch("/api/tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-prices" }),
      });
      await loadRecs();
    } catch { /* silent */ }
  }

  async function runQuickScan() {
    setScanning(true);
    setScanMsg("Scanning 80 stocks with live prices…");
    try {
      const res = await fetch("/api/rescan", { method: "POST" });
      if (res.ok) {
        const d = await res.json();
        setScanMsg(`Done — scanned ${d.scanned}, saved ${d.saved} picks: ${d.topPicks?.join(", ")}`);
        setFilter("active");
        await loadRecs();
      } else {
        setScanMsg("Scan failed — check console");
      }
    } catch (e) {
      setScanMsg(`Error: ${e}`);
    } finally {
      setScanning(false);
      setTimeout(() => setScanMsg(""), 8000);
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
    { label: "Active",  value: "active"  },
    { label: "Closed",  value: "closed"  },
    { label: "All",     value: "all"     },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-white">Weekly Picks</h1>
          <p className="text-gray-400 mt-1 text-sm">
            {filter === "active" ? `${recs.length} active position${recs.length !== 1 ? "s" : ""}` : `${recs.length} total`}
            {" · "}
            <button
              onClick={refreshPrices}
              className="text-emerald-400 hover:text-emerald-300 underline text-xs"
            >
              refresh prices
            </button>
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === f.value ? "bg-emerald-500 text-black" : "text-gray-400 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <Button onClick={runQuickScan} disabled={scanning} size="sm">
            {scanning
              ? <><RefreshCw className="w-3 h-3 animate-spin" />Scanning…</>
              : <><Crosshair className="w-3 h-3" />Quick Rescan</>
            }
          </Button>
        </div>
      </div>

      {/* Scan status message */}
      {scanMsg && (
        <div className="mb-6 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
          <p className="text-emerald-400 text-sm">{scanMsg}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
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
          <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">
            {filter === "active" ? "No active picks" : "No recommendations yet"}
          </h3>
          <p className="text-gray-500 mb-6 text-sm">
            Run a Quick Rescan to generate this week&apos;s AI-powered 10x picks with live prices.
          </p>
          <Button onClick={runQuickScan} disabled={scanning} size="lg">
            <Crosshair className="w-4 h-4" />
            {scanning ? "Scanning…" : "Quick Rescan (Live Prices)"}
          </Button>
        </div>
      )}
    </div>
  );
}
