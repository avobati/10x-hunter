"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Plus, Trash2, TrendingUp, Search, X } from "lucide-react";
import { formatCurrency, getReturnColor } from "@/lib/utils";
import { SCAN_UNIVERSE } from "@/lib/universe";

interface WatchItem {
  ticker: string;
  name: string;
  addedAt: string;
  notes: string;
}

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("10x-watchlist");
    if (saved) setWatchlist(JSON.parse(saved));
  }, []);

  function save(items: WatchItem[]) {
    setWatchlist(items);
    localStorage.setItem("10x-watchlist", JSON.stringify(items));
  }

  function addToWatchlist(ticker: string, name: string) {
    if (watchlist.find((w) => w.ticker === ticker)) return;
    save([...watchlist, { ticker, name, addedAt: new Date().toISOString(), notes }]);
    setAdding(false);
    setSearch("");
    setNotes("");
  }

  function remove(ticker: string) {
    save(watchlist.filter((w) => w.ticker !== ticker));
  }

  const filtered = SCAN_UNIVERSE.filter(
    (s) =>
      search &&
      (s.ticker.toLowerCase().includes(search.toLowerCase()) ||
        s.name.toLowerCase().includes(search.toLowerCase()))
  ).slice(0, 8);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Watchlist</h1>
          <p className="text-gray-400 mt-1">Track stocks on your radar</p>
        </div>
        <Button onClick={() => setAdding(true)} disabled={adding}>
          <Plus className="w-4 h-4" /> Add Stock
        </Button>
      </div>

      {/* Add stock */}
      {adding && (
        <Card className="border-emerald-500/30">
          <CardContent className="pt-6 space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search ticker or company name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-white/5 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <Button variant="ghost" size="icon" onClick={() => { setAdding(false); setSearch(""); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Results */}
            {filtered.length > 0 && (
              <div className="space-y-1">
                {filtered.map((s) => (
                  <button
                    key={s.ticker}
                    onClick={() => addToWatchlist(s.ticker, s.name)}
                    disabled={!!watchlist.find((w) => w.ticker === s.ticker)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-white font-bold w-12 text-left">{s.ticker}</span>
                      <span className="text-gray-400 text-sm">{s.name}</span>
                    </div>
                    <Badge variant="outline">{s.sector}</Badge>
                  </button>
                ))}
              </div>
            )}

            {search && filtered.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">
                No matching stocks in universe. Type exact ticker to add manually.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Watchlist */}
      {watchlist.length > 0 ? (
        <div className="space-y-3">
          {watchlist.map((item) => {
            const stockInfo = SCAN_UNIVERSE.find((s) => s.ticker === item.ticker);
            return (
              <div key={item.ticker} className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                <Star className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{item.ticker}</span>
                    {stockInfo && <Badge variant="outline" className="text-xs">{stockInfo.sector}</Badge>}
                  </div>
                  <p className="text-gray-400 text-sm">{item.name}</p>
                  {item.notes && <p className="text-gray-600 text-xs mt-1">{item.notes}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-gray-500 text-xs">
                    Added {new Date(item.addedAt).toLocaleDateString()}
                  </p>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(item.ticker)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-16 text-center">
          <Star className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Watchlist is empty</h3>
          <p className="text-gray-500 mb-6">Add stocks you want to monitor for future opportunities.</p>
          <Button onClick={() => setAdding(true)}>
            <Plus className="w-4 h-4" /> Add First Stock
          </Button>
        </div>
      )}
    </div>
  );
}
