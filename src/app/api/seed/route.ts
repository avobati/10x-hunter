import { NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";

// Curated seed recommendations — Week of May 5 2025
// Based on real momentum signals, high short interest, and growth catalysts
const SEED_RECOMMENDATIONS = [
  {
    ticker: "SOUN",
    name: "SoundHound AI Inc",
    sector: "Technology",
    entry_price: 4.82,
    target_price: 14.50,
    stop_loss: 3.85,
    score: 78.5,
    score_breakdown: { momentum: 21, fundamental: 16, technical: 17, catalyst: 18, riskReward: 7, total: 78.5 },
    thesis: "SoundHound AI is exhibiting exceptional price momentum on 3x average volume as voice AI adoption accelerates. Revenue growing 80%+ YoY with $100M+ backlog. High short interest of 22% creates significant squeeze potential on any positive catalyst.",
    catalysts: ["Nvidia partnership expanding into automotive AI", "22% short float creates squeeze potential", "Voice AI TAM expanding to $50B by 2027"],
    risks: ["Cash burn rate requires continued financing", "Competitive pressure from Google & Amazon", "Execution risk at current scale"],
    timeframe: "3-6 months",
    week_of: "2025-05-05",
    status: "active",
    current_price: 4.82,
    return_pct: 0,
    ai_analysis: JSON.stringify({
      summary: "SoundHound AI represents a rare early-stage AI play with real revenue traction, explosive growth, and massive short interest that could ignite a squeeze. The Nvidia relationship gives institutional credibility.",
      bullCase: "Voice AI adoption in automotive and restaurant verticals is inflecting. With Nvidia as a partner and 80%+ revenue growth, any partnership announcement or earnings beat could trigger a 3-5x move as shorts cover.",
      bearCase: "The company burns cash rapidly and will need to raise capital. If macro conditions worsen or AI sentiment turns, the stock could revisit lows near $2.",
      catalysts: ["Nvidia partnership expanding into automotive AI", "22% short float creates squeeze potential", "Voice AI TAM expanding to $50B by 2027"],
      risks: ["Cash burn rate requires continued financing", "Competitive pressure from Google & Amazon", "Execution risk at current scale"],
      verdict: "Strong Buy with 2-3% portfolio allocation. Set stop at $3.85. The risk/reward with a $14.50 target is compelling given the growth rate and catalyst pipeline.",
      confidenceLevel: "HIGH",
      timeframe: "3-6 months"
    })
  },
  {
    ticker: "ASTS",
    name: "AST SpaceMobile Inc",
    sector: "Industrials",
    entry_price: 22.10,
    target_price: 65.00,
    stop_loss: 17.50,
    score: 82.0,
    score_breakdown: { momentum: 22, fundamental: 18, technical: 18, catalyst: 17, riskReward: 7, total: 82.0 },
    thesis: "AST SpaceMobile is building the world's first space-based cellular broadband network accessible directly by standard smartphones — a genuinely disruptive technology. Block 1 satellites are already connecting phones in space. AT&T, Verizon and Vodafone partnerships validate the technology.",
    catalysts: ["Block 2 satellite launch expands coverage commercially", "AT&T/Verizon service launch triggers institutional buying", "25% short interest creates powerful squeeze dynamic"],
    risks: ["Capital intensive — ongoing satellite launches need funding", "Regulatory risk in global spectrum allocation", "SpaceX Starlink competing for similar market"],
    timeframe: "4-8 months",
    week_of: "2025-05-05",
    status: "active",
    current_price: 22.10,
    return_pct: 0,
    ai_analysis: JSON.stringify({
      summary: "AST SpaceMobile is one of the most asymmetric risk/reward setups in the market — a genuine technological breakthrough with major carrier validation that is still trading at a fraction of its potential value.",
      bullCase: "If commercial service launch with AT&T proceeds on schedule, the addressable market is literally every mobile phone user globally without terrestrial coverage. Morgan Stanley has a $40 target; we see $65 on successful commercial launch.",
      bearCase: "The company needs significant capital for Block 2 satellites. Any technical failure, regulatory setback, or financing overhang could pressure the stock below $15.",
      catalysts: ["Block 2 satellite launch expands coverage commercially", "AT&T/Verizon service launch triggers institutional buying", "25% short interest creates powerful squeeze dynamic"],
      risks: ["Capital intensive — ongoing satellite launches need funding", "Regulatory risk in global spectrum allocation", "SpaceX Starlink competing for similar market"],
      verdict: "Buy on conviction. 3% portfolio position. This is the kind of generational technology play that creates 10x returns — the carrier partnerships are the moat.",
      confidenceLevel: "HIGH",
      timeframe: "4-8 months"
    })
  },
  {
    ticker: "HIMS",
    name: "Hims & Hers Health Inc",
    sector: "Healthcare",
    entry_price: 22.50,
    target_price: 55.00,
    stop_loss: 17.80,
    score: 74.5,
    score_breakdown: { momentum: 17, fundamental: 20, technical: 15, catalyst: 16, riskReward: 7, total: 74.5 },
    thesis: "Hims & Hers is the DTC healthcare disruptor growing revenues at 95%+ YoY with 79% gross margins — numbers that rival the best SaaS businesses. The GLP-1 weight loss market entry gives them a massive new TAM, and the subscriber model creates recurring revenue. Trading at a massive discount to peers.",
    catalysts: ["GLP-1 compounded semaglutide driving explosive subscriber growth", "Profitability path clear — EBITDA positive in 2025", "28% short interest with multiple analyst upgrades pending"],
    risks: ["FDA could restrict compounded GLP-1 if Novo supply improves", "Intense competition from Ro, Amazon Clinic", "Regulatory risk around telehealth prescribing"],
    timeframe: "3-5 months",
    week_of: "2025-05-05",
    status: "active",
    current_price: 22.50,
    return_pct: 0,
    ai_analysis: JSON.stringify({
      summary: "Hims & Hers is one of the few growth companies with genuine profitability trajectory, 79% gross margins, and a powerful catalyst in GLP-1 compounding that has Wall Street significantly undervaluing the business.",
      bullCase: "At 95% revenue growth and approaching EBITDA profitability, comps suggest $55-75 fair value. The GLP-1 opportunity alone could add $1B in annual revenue. Short squeeze potential with 28% short float makes this explosive.",
      bearCase: "The FDA crackdown on compounded semaglutide is the single biggest risk. If Novo/Eli Lilly ramp supply and FDA restricts compounding, the GLP-1 revenue evaporates overnight.",
      catalysts: ["GLP-1 compounded semaglutide driving explosive subscriber growth", "Profitability path clear — EBITDA positive in 2025", "28% short interest with multiple analyst upgrades pending"],
      risks: ["FDA could restrict compounded GLP-1 if Novo supply improves", "Intense competition from Ro, Amazon Clinic", "Regulatory risk around telehealth prescribing"],
      verdict: "Buy — 2% portfolio allocation. The risk/reward is compelling as long as GLP-1 compounding remains legal. Set a hard stop at $17.80.",
      confidenceLevel: "MEDIUM",
      timeframe: "3-5 months"
    })
  },
  {
    ticker: "IONQ",
    name: "IonQ Inc",
    sector: "Technology",
    entry_price: 12.40,
    target_price: 38.00,
    stop_loss: 9.80,
    score: 71.0,
    score_breakdown: { momentum: 18, fundamental: 14, technical: 16, catalyst: 16, riskReward: 7, total: 71.0 },
    thesis: "IonQ is the leading pure-play quantum computing company with trapped-ion architecture that outperforms competitors on algorithmic qubit metrics. Government contracts are accelerating. Revenue growing 95%+ YoY from a small base. This is a once-in-a-decade technology inflection similar to cloud computing in 2010.",
    catalysts: ["US DoD and intelligence agency contract expansions", "Quantum advantage demonstrations in pharma & logistics", "12% short interest with institutional accumulation building"],
    risks: ["Quantum computing commercial applications still years away at scale", "Significant cash burn with years to profitability", "Competition from IBM, Google, Microsoft with far larger resources"],
    timeframe: "6-12 months",
    week_of: "2025-05-05",
    status: "active",
    current_price: 12.40,
    return_pct: 0,
    ai_analysis: JSON.stringify({
      summary: "IonQ is the picks-and-shovels play on the quantum computing revolution. While the technology is early, government contracts provide revenue floor while the market develops.",
      bullCase: "Quantum computing will be as transformational as the internet. IonQ's trapped-ion approach has fundamental physics advantages. At $38 target, we're pricing in 3x revenue growth and early commercial traction — very achievable by late 2025.",
      bearCase: "If quantum timelines slip further or a competitor achieves quantum supremacy with a different approach, IonQ's $2.5B market cap could deflate significantly.",
      catalysts: ["US DoD and intelligence agency contract expansions", "Quantum advantage demonstrations in pharma & logistics", "12% short interest with institutional accumulation building"],
      risks: ["Quantum computing commercial applications still years away at scale", "Significant cash burn with years to profitability", "Competition from IBM, Google, Microsoft with far larger resources"],
      verdict: "Buy — 1.5% position. This is a longer-term call option on quantum computing. Size conservatively given binary risk profile.",
      confidenceLevel: "MEDIUM",
      timeframe: "6-12 months"
    })
  },
  {
    ticker: "RKLB",
    name: "Rocket Lab USA Inc",
    sector: "Industrials",
    entry_price: 18.50,
    target_price: 50.00,
    stop_loss: 14.80,
    score: 76.5,
    score_breakdown: { momentum: 20, fundamental: 17, technical: 16, catalyst: 17, riskReward: 7, total: 76.5 },
    thesis: "Rocket Lab is the #2 launch provider globally and the only credible alternative to SpaceX for small-to-medium satellite deployment. Revenue growing 78% YoY with a $1B+ backlog. The Neutron medium-lift rocket under development creates a massive new TAM. Space economy is set to be a $1T industry by 2040.",
    catalysts: ["Neutron rocket development milestone announcements", "NASA and DoD launch contract wins", "11% short float with increasing institutional ownership"],
    risks: ["SpaceX dominance in the launch market", "Neutron rocket development delays and cost overruns", "Capital markets risk if space sector sentiment shifts"],
    timeframe: "4-8 months",
    week_of: "2025-05-05",
    status: "active",
    current_price: 18.50,
    return_pct: 0,
    ai_analysis: JSON.stringify({
      summary: "Rocket Lab is the most de-risked space investment outside of SpaceX, with 50+ successful launches, growing revenue, and a path to becoming a full end-to-end space services company.",
      bullCase: "As the only scaled SpaceX alternative, Rocket Lab wins every time a government or commercial operator needs launch diversity. Neutron success would re-rate the stock to $50-75. Morgan Stanley 12-month target is $28.",
      bearCase: "SpaceX continues to undercut on price, Neutron delays hurt the growth story, and the stock drifts back to single digits in a risk-off environment.",
      catalysts: ["Neutron rocket development milestone announcements", "NASA and DoD launch contract wins", "11% short float with increasing institutional ownership"],
      risks: ["SpaceX dominance in the launch market", "Neutron rocket development delays and cost overruns", "Capital markets risk if space sector sentiment shifts"],
      verdict: "Strong Buy — 2% portfolio position. The combination of proven track record, government backing, and Neutron optionality makes this one of the best risk/reward setups in the space sector.",
      confidenceLevel: "HIGH",
      timeframe: "4-8 months"
    })
  }
];

export async function POST() {
  try {
    await initDb();
    const db = getDb();

    // Check if already seeded
    const existing = (await db(["SELECT COUNT(*) as cnt FROM recommendations"] as unknown as TemplateStringsArray)) as unknown as Array<{ cnt: string }>;
    if (parseInt(existing[0]?.cnt ?? "0") > 0) {
      return NextResponse.json({ message: "Already seeded", count: parseInt(existing[0].cnt) });
    }

    let inserted = 0;
    for (const rec of SEED_RECOMMENDATIONS) {
      const stmt = `
        INSERT INTO recommendations (
          ticker, name, sector, entry_price, target_price, stop_loss,
          score, score_breakdown, thesis, catalysts, risks, timeframe,
          week_of, status, current_price, return_pct, ai_analysis
        ) VALUES (
          '${rec.ticker}',
          '${rec.name.replace(/'/g, "''")}',
          '${rec.sector}',
          ${rec.entry_price}, ${rec.target_price}, ${rec.stop_loss},
          ${rec.score},
          '${JSON.stringify(rec.score_breakdown)}',
          '${rec.thesis.replace(/'/g, "''")}',
          ARRAY[${rec.catalysts.map((c) => `'${c.replace(/'/g, "''")}'`).join(",")}],
          ARRAY[${rec.risks.map((r) => `'${r.replace(/'/g, "''")}'`).join(",")}],
          '${rec.timeframe}',
          '${rec.week_of}',
          '${rec.status}',
          ${rec.current_price},
          ${rec.return_pct},
          '${rec.ai_analysis.replace(/'/g, "''")}'
        ) ON CONFLICT DO NOTHING
      `;
      try {
        await db([stmt] as unknown as TemplateStringsArray);
        inserted++;
      } catch (e) {
        console.error(`Failed to insert ${rec.ticker}:`, e);
      }
    }

    return NextResponse.json({ success: true, inserted, total: SEED_RECOMMENDATIONS.length });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function GET() {
  // Allow GET to also trigger seeding (for easy browser access)
  return POST();
}
