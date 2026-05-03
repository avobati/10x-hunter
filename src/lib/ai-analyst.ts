import Anthropic from "@anthropic-ai/sdk";
import { StockData, scoreStock, generateThesis, calculateTargets } from "./scoring-engine";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface AIAnalysis {
  summary: string;
  bullCase: string;
  bearCase: string;
  catalysts: string[];
  risks: string[];
  verdict: string;
  confidenceLevel: "HIGH" | "MEDIUM" | "LOW";
  timeframe: string;
}

export async function analyzeStockWithAI(data: StockData): Promise<AIAnalysis> {
  const score = scoreStock(data);
  const { targetPrice, stopLoss } = calculateTargets(data, score.total);
  const thesis = generateThesis(data, score);

  const prompt = `You are a top-tier hedge fund analyst specializing in identifying explosive growth opportunities — stocks that can 10x within 3-12 months. Your approach combines:
- O'Neil's CAN SLIM methodology (earnings growth, relative strength, new highs)
- Driehaus momentum investing (buy strength, sell weakness)
- Peter Lynch's growth at reasonable price (GARP)
- Stan Weinstein's stage analysis (Stage 2 uptrends only)

Analyze this stock for 10x potential:

**Ticker:** ${data.ticker}
**Price:** $${data.price.toFixed(2)}
**Market Cap:** $${(data.marketCap / 1e6).toFixed(0)}M
**Sector:** ${data.sector || "Unknown"}

**Momentum Signals:**
- 1-Day Change: ${data.priceChange1d?.toFixed(2)}%
- 1-Week Change: ${data.priceChange1w?.toFixed(2)}%
- 1-Month Change: ${data.priceChange1m?.toFixed(2)}%
- 3-Month Change: ${data.priceChange3m?.toFixed(2)}%
- Volume vs Average: ${data.avgVolume > 0 ? (data.volume / data.avgVolume).toFixed(1) : "N/A"}x

**Fundamental Data:**
- P/E Ratio: ${data.pe ?? "N/A"}
- P/S Ratio: ${data.ps ?? "N/A"}
- Revenue Growth: ${data.revenueGrowth != null ? data.revenueGrowth.toFixed(0) + "%" : "N/A"}
- Gross Margin: ${data.grossMargin != null ? data.grossMargin.toFixed(0) + "%" : "N/A"}

**Technical Indicators:**
- RSI(14): ${data.rsi?.toFixed(1)}
- MACD: ${data.macd?.toFixed(3)} | Signal: ${data.macdSignal?.toFixed(3)}
- Price vs SMA50: ${data.sma50 > 0 ? ((data.price / data.sma50 - 1) * 100).toFixed(1) + "%" : "N/A"}
- Price vs SMA200: ${data.sma200 > 0 ? ((data.price / data.sma200 - 1) * 100).toFixed(1) + "%" : "N/A"}
- Beta: ${data.beta?.toFixed(2)}

**Special Factors:**
- Short Float: ${data.shortFloat != null ? data.shortFloat.toFixed(0) + "%" : "N/A"}
- Insider Buying: ${data.insiderBuying ? "YES" : "No recent activity"}
- Institutional Ownership: ${data.institutionalOwnership != null ? data.institutionalOwnership.toFixed(0) + "%" : "N/A"}

**Quant Score:** ${score.total.toFixed(1)}/100
- Momentum: ${score.momentum}/25
- Fundamental: ${score.fundamental}/25
- Technical: ${score.technical}/20
- Catalyst: ${score.catalyst}/20
- Risk/Reward: ${score.riskReward}/10

**Entry:** $${data.price.toFixed(2)} | **Target:** $${targetPrice.toFixed(2)} | **Stop:** $${stopLoss.toFixed(2)}

Provide analysis as JSON with these exact keys:
{
  "summary": "2-3 sentence executive summary of the 10x opportunity",
  "bullCase": "Detailed bull case — what needs to happen for 10x",
  "bearCase": "What could go wrong — be honest about risks",
  "catalysts": ["catalyst 1", "catalyst 2", "catalyst 3"],
  "risks": ["risk 1", "risk 2", "risk 3"],
  "verdict": "Final recommendation with specific reasoning",
  "confidenceLevel": "HIGH" | "MEDIUM" | "LOW",
  "timeframe": "Expected timeframe for the thesis to play out"
}

Only return valid JSON. No markdown, no preamble.`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: "You are an elite hedge fund analyst. Return only valid JSON, no markdown.",
    messages: [{ role: "user", content: prompt }],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    return getFallbackAnalysis(data, score.total);
  }

  try {
    const analysis = JSON.parse(content.text) as AIAnalysis;
    return analysis;
  } catch {
    return getFallbackAnalysis(data, score.total);
  }
}

function getFallbackAnalysis(data: StockData, score: number): AIAnalysis {
  return {
    summary: `${data.ticker} scores ${score.toFixed(0)}/100 on our multi-factor model. The stock shows ${score >= 70 ? "strong" : "moderate"} 10x potential based on momentum, technical, and fundamental signals.`,
    bullCase: `Strong momentum with increasing volume suggests institutional accumulation. If growth trends continue, the stock could see significant multiple expansion.`,
    bearCase: `Market conditions, sector rotation, or earnings disappointments could derail the thesis. Small caps are highly volatile and liquidity risk is real.`,
    catalysts: ["Earnings beat", "Product launch or partnership announcement", "Sector rotation into growth"],
    risks: ["Market downturn affecting risk assets", "Fundamental deterioration", "Competitive pressure"],
    verdict: score >= 75 ? "Strong Buy — Position size 2-5% of portfolio" : score >= 60 ? "Buy — Start with 1-2% position" : "Watch — Add to watchlist, wait for better entry",
    confidenceLevel: score >= 75 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW",
    timeframe: "3-6 months",
  };
}
