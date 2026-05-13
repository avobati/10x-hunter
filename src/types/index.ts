export interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  marketCap: number;
  price: number;
  volume: number;
  avgVolume: number;
  priceChange1d: number;
  priceChange1w: number;
  priceChange1m: number;
  pe: number | null;
  ps: number | null;
  pb: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  rsi: number;
  macd: number;
  macdSignal: number;
  sma50: number;
  sma200: number;
  beta: number;
  shortFloat: number | null;
  insiderOwnership: number | null;
  institutionalOwnership: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Recommendation {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  entryPrice: number;
  targetPrice: number;
  stopLoss: number;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  thesis: string;
  catalysts: string[];
  risks: string[];
  timeframe: string;
  weekOf: string;
  status: 'active' | 'closed' | 'stopped';
  currentPrice?: number;
  returnPct?: number;
  closedAt?: Date;
  closedPrice?: number;
  aiAnalysis?: string;
  createdAt: Date;
}

export interface ScoreBreakdown {
  momentum: number;        // 0-25: price + volume momentum
  fundamental: number;     // 0-25: growth + margins + valuation
  technical: number;       // 0-20: RSI, MACD, MA crossovers
  catalyst: number;        // 0-20: upcoming events, insider buying
  riskReward: number;      // 0-10: setup quality
  total: number;           // 0-100
  regime?: string;
  baseEligible?: boolean;
  barsSinceBuy?: number | null;
  relativeStrength?: number;
  acceleration?: number;
  industryLeadership?: number;
  smartMoney?: number;
}

export interface PerformanceMetrics {
  totalRecommendations: number;
  activeRecommendations: number;
  winners: number;
  losers: number;
  winRate: number;
  avgReturn: number;
  bestReturn: number;
  worstReturn: number;
  avgHoldingDays: number;
  totalReturnPct: number;
  sharpeRatio: number;
  tenXCandidates: number;
}

export interface WeeklyScan {
  id: string;
  weekOf: string;
  scanDate: Date;
  stocksScanned: number;
  candidatesFound: number;
  topPicks: string[];
  marketCondition: 'bull' | 'bear' | 'neutral';
  notes: string;
}

export interface StockQuote {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
}

export interface WatchlistItem {
  id: string;
  ticker: string;
  name: string;
  addedPrice: number;
  currentPrice: number;
  score: number;
  notes: string;
  alertPrice: number | null;
  createdAt: Date;
}
