export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  industry VARCHAR(100),
  market_cap BIGINT,
  price DECIMAL(12,4),
  volume BIGINT,
  avg_volume BIGINT,
  price_change_1d DECIMAL(8,4),
  price_change_1w DECIMAL(8,4),
  price_change_1m DECIMAL(8,4),
  pe DECIMAL(10,2),
  ps DECIMAL(10,2),
  pb DECIMAL(10,2),
  revenue_growth DECIMAL(8,4),
  gross_margin DECIMAL(8,4),
  rsi DECIMAL(6,2),
  macd DECIMAL(10,4),
  macd_signal DECIMAL(10,4),
  sma50 DECIMAL(12,4),
  sma200 DECIMAL(12,4),
  beta DECIMAL(6,2),
  short_float DECIMAL(8,4),
  insider_ownership DECIMAL(8,4),
  institutional_ownership DECIMAL(8,4),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sector VARCHAR(100),
  entry_price DECIMAL(12,4) NOT NULL,
  target_price DECIMAL(12,4) NOT NULL,
  stop_loss DECIMAL(12,4) NOT NULL,
  score DECIMAL(6,2) NOT NULL,
  score_breakdown JSONB NOT NULL DEFAULT '{}',
  thesis TEXT NOT NULL,
  catalysts TEXT[] DEFAULT '{}',
  risks TEXT[] DEFAULT '{}',
  timeframe VARCHAR(50) DEFAULT '3-6 months',
  week_of DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  current_price DECIMAL(12,4),
  return_pct DECIMAL(8,4),
  closed_at TIMESTAMP,
  closed_price DECIMAL(12,4),
  ai_analysis TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_of DATE NOT NULL UNIQUE,
  scan_date TIMESTAMP DEFAULT NOW(),
  stocks_scanned INTEGER DEFAULT 0,
  candidates_found INTEGER DEFAULT 0,
  top_picks TEXT[] DEFAULT '{}',
  market_condition VARCHAR(20) DEFAULT 'neutral',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker VARCHAR(10) NOT NULL,
  name VARCHAR(255) NOT NULL,
  added_price DECIMAL(12,4) NOT NULL,
  current_price DECIMAL(12,4),
  score DECIMAL(6,2),
  notes TEXT,
  alert_price DECIMAL(12,4),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(ticker)
);

CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES recommendations(id),
  ticker VARCHAR(10) NOT NULL,
  price DECIMAL(12,4) NOT NULL,
  return_pct DECIMAL(8,4),
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recommendations_ticker ON recommendations(ticker);
CREATE INDEX IF NOT EXISTS idx_recommendations_week_of ON recommendations(week_of);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON recommendations(status);
CREATE INDEX IF NOT EXISTS idx_price_history_recommendation_id ON price_history(recommendation_id);
`;
