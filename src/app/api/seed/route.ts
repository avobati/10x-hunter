import { NextResponse } from "next/server";
import { initDb, getDb } from "@/lib/db";

const SEED: Array<{
  ticker: string; name: string; sector: string;
  entry_price: number; target_price: number; stop_loss: number;
  score: number; score_breakdown: object;
  thesis: string; catalysts: string[]; risks: string[];
  timeframe: string; week_of: string; ai_analysis: string;
}> = [
  {
    ticker: "SOUN", name: "SoundHound AI Inc", sector: "Technology",
    entry_price: 4.82, target_price: 14.50, stop_loss: 3.85, score: 78.5,
    score_breakdown: { momentum:21, fundamental:16, technical:17, catalyst:18, riskReward:7, total:78.5 },
    thesis: "SoundHound AI is exhibiting exceptional price momentum on 3x average volume as voice AI adoption accelerates. Revenue growing 80%+ YoY with $100M+ backlog. High short interest of 22% creates significant squeeze potential on any positive catalyst.",
    catalysts: ["Nvidia partnership expanding into automotive AI","22% short float creates squeeze potential","Voice AI TAM expanding to $50B by 2027"],
    risks: ["Cash burn rate requires continued financing","Competitive pressure from Google & Amazon","Execution risk at current scale"],
    timeframe: "3-6 months", week_of: "2025-05-05",
    ai_analysis: JSON.stringify({ summary:"SoundHound AI represents a rare early-stage AI play with real revenue traction and massive short interest that could ignite a squeeze.", bullCase:"Voice AI adoption in automotive and restaurant verticals is inflecting. With Nvidia as a partner and 80%+ revenue growth, any partnership announcement could trigger a 3-5x move.", bearCase:"The company burns cash rapidly. If AI sentiment turns, the stock could revisit lows near $2.", catalysts:["Nvidia partnership expanding into automotive AI","22% short float creates squeeze potential","Voice AI TAM expanding to $50B by 2027"], risks:["Cash burn rate requires continued financing","Competitive pressure from Google & Amazon","Execution risk at current scale"], verdict:"Strong Buy — 2-3% portfolio allocation. Stop at $3.85. The risk/reward with a $14.50 target is compelling.", confidenceLevel:"HIGH", timeframe:"3-6 months" }),
  },
  {
    ticker: "ASTS", name: "AST SpaceMobile Inc", sector: "Industrials",
    entry_price: 22.10, target_price: 65.00, stop_loss: 17.50, score: 82.0,
    score_breakdown: { momentum:22, fundamental:18, technical:18, catalyst:17, riskReward:7, total:82.0 },
    thesis: "AST SpaceMobile is building the world's first space-based cellular broadband network accessible directly by standard smartphones. AT&T, Verizon and Vodafone partnerships validate the technology. Block 1 satellites are already operational.",
    catalysts: ["Block 2 satellite launch expands coverage commercially","AT&T/Verizon service launch triggers institutional buying","25% short interest creates powerful squeeze dynamic"],
    risks: ["Capital intensive — ongoing satellite launches need funding","Regulatory risk in global spectrum allocation","SpaceX Starlink competing for similar market"],
    timeframe: "4-8 months", week_of: "2025-05-05",
    ai_analysis: JSON.stringify({ summary:"AST SpaceMobile is one of the most asymmetric risk/reward setups in the market — a genuine technological breakthrough with major carrier validation.", bullCase:"If commercial service launches with AT&T, the addressable market is every mobile phone user globally without terrestrial coverage. We see $65 on successful commercial launch.", bearCase:"Capital raises for Block 2 could pressure stock. Any technical failure or regulatory setback could send it below $15.", catalysts:["Block 2 satellite launch expands coverage commercially","AT&T/Verizon service launch triggers institutional buying","25% short interest creates powerful squeeze dynamic"], risks:["Capital intensive — ongoing satellite launches need funding","Regulatory risk in global spectrum allocation","SpaceX Starlink competing for similar market"], verdict:"Buy on conviction — 3% portfolio position. Generational technology play with carrier-validated moat.", confidenceLevel:"HIGH", timeframe:"4-8 months" }),
  },
  {
    ticker: "HIMS", name: "Hims & Hers Health Inc", sector: "Healthcare",
    entry_price: 22.50, target_price: 55.00, stop_loss: 17.80, score: 74.5,
    score_breakdown: { momentum:17, fundamental:20, technical:15, catalyst:16, riskReward:7, total:74.5 },
    thesis: "Hims & Hers is the DTC healthcare disruptor growing revenues at 95%+ YoY with 79% gross margins. GLP-1 weight loss market entry creates massive new TAM. The subscriber model drives recurring revenue. Trading at steep discount to peers.",
    catalysts: ["GLP-1 compounded semaglutide driving explosive subscriber growth","Profitability path clear — EBITDA positive in 2025","28% short interest with multiple analyst upgrades pending"],
    risks: ["FDA could restrict compounded GLP-1 if Novo supply improves","Intense competition from Ro, Amazon Clinic","Regulatory risk around telehealth prescribing"],
    timeframe: "3-5 months", week_of: "2025-05-05",
    ai_analysis: JSON.stringify({ summary:"Hims & Hers has genuine profitability trajectory, 79% gross margins, and a powerful catalyst in GLP-1 compounding that Wall Street is significantly undervaluing.", bullCase:"At 95% revenue growth approaching EBITDA profitability, comps suggest $55-75 fair value. GLP-1 opportunity alone could add $1B annual revenue.", bearCase:"FDA crackdown on compounded semaglutide is the single biggest risk — if Novo/Eli Lilly ramp supply, GLP-1 revenue evaporates overnight.", catalysts:["GLP-1 compounded semaglutide driving explosive subscriber growth","Profitability path clear — EBITDA positive in 2025","28% short interest with multiple analyst upgrades pending"], risks:["FDA could restrict compounded GLP-1 if Novo supply improves","Intense competition from Ro, Amazon Clinic","Regulatory risk around telehealth prescribing"], verdict:"Buy — 2% portfolio allocation. Hard stop at $17.80. Compelling risk/reward as long as GLP-1 compounding remains legal.", confidenceLevel:"MEDIUM", timeframe:"3-5 months" }),
  },
  {
    ticker: "RKLB", name: "Rocket Lab USA Inc", sector: "Industrials",
    entry_price: 18.50, target_price: 50.00, stop_loss: 14.80, score: 76.5,
    score_breakdown: { momentum:20, fundamental:17, technical:16, catalyst:17, riskReward:7, total:76.5 },
    thesis: "Rocket Lab is the #2 launch provider globally and the only credible SpaceX alternative for small-to-medium satellite deployment. Revenue growing 78% YoY with $1B+ backlog. Neutron medium-lift rocket creates massive new TAM in a $1T space economy.",
    catalysts: ["Neutron rocket development milestone announcements","NASA and DoD launch contract wins","11% short float with increasing institutional ownership"],
    risks: ["SpaceX dominance in the launch market","Neutron development delays and cost overruns","Capital markets risk if space sector sentiment shifts"],
    timeframe: "4-8 months", week_of: "2025-05-05",
    ai_analysis: JSON.stringify({ summary:"Rocket Lab is the most de-risked space investment outside SpaceX — 50+ successful launches, growing revenue, and full end-to-end space services ambition.", bullCase:"As the only scaled SpaceX alternative, Rocket Lab wins every time operators need launch diversity. Neutron success re-rates to $50-75.", bearCase:"SpaceX undercutting on price, Neutron delays, and the stock drifts back to single digits in risk-off conditions.", catalysts:["Neutron rocket development milestone announcements","NASA and DoD launch contract wins","11% short float with increasing institutional ownership"], risks:["SpaceX dominance in the launch market","Neutron development delays and cost overruns","Capital markets risk if space sector sentiment shifts"], verdict:"Strong Buy — 2% portfolio position. Proven track record plus Neutron optionality is one of the best risk/reward setups in space.", confidenceLevel:"HIGH", timeframe:"4-8 months" }),
  },
  {
    ticker: "IONQ", name: "IonQ Inc", sector: "Technology",
    entry_price: 12.40, target_price: 38.00, stop_loss: 9.80, score: 71.0,
    score_breakdown: { momentum:18, fundamental:14, technical:16, catalyst:16, riskReward:7, total:71.0 },
    thesis: "IonQ is the leading pure-play quantum computing company with trapped-ion architecture outperforming competitors on algorithmic qubit metrics. Government contracts accelerating. Revenue growing 95%+ YoY. This is a once-in-a-decade technology inflection.",
    catalysts: ["US DoD and intelligence agency contract expansions","Quantum advantage demonstrations in pharma and logistics","12% short interest with institutional accumulation building"],
    risks: ["Commercial quantum applications still years away at scale","Significant cash burn with years to profitability","Competition from IBM, Google, Microsoft with far larger resources"],
    timeframe: "6-12 months", week_of: "2025-05-05",
    ai_analysis: JSON.stringify({ summary:"IonQ is the picks-and-shovels play on the quantum computing revolution. Government contracts provide revenue floor while the commercial market develops.", bullCase:"Quantum computing will be as transformational as the internet. IonQ trapped-ion approach has fundamental physics advantages. $38 target prices in 3x revenue growth — achievable by late 2025.", bearCase:"If quantum timelines slip or a competitor achieves supremacy, the $2.5B market cap could deflate significantly.", catalysts:["US DoD and intelligence agency contract expansions","Quantum advantage demonstrations in pharma and logistics","12% short interest with institutional accumulation building"], risks:["Commercial quantum applications still years away at scale","Significant cash burn with years to profitability","Competition from IBM, Google, Microsoft with far larger resources"], verdict:"Buy — 1.5% position. Longer-term call option on quantum computing. Size conservatively given binary risk profile.", confidenceLevel:"MEDIUM", timeframe:"6-12 months" }),
  },
];

export async function GET() { return handler(); }
export async function POST() { return handler(); }

async function handler() {
  try {
    await initDb();
    const sql = getDb();

    // Check if already seeded
    const rows = await sql`SELECT COUNT(*)::int AS cnt FROM recommendations` as unknown as Array<{ cnt: number }>;
    const count = rows[0]?.cnt ?? 0;
    if (count > 0) {
      return NextResponse.json({ message: "Already seeded", count });
    }

    let inserted = 0;
    for (const rec of SEED) {
      try {
        await sql`
          INSERT INTO recommendations (
            ticker, name, sector, entry_price, target_price, stop_loss,
            score, score_breakdown, thesis, catalysts, risks, timeframe,
            week_of, status, current_price, return_pct, ai_analysis
          ) VALUES (
            ${rec.ticker}, ${rec.name}, ${rec.sector},
            ${rec.entry_price}, ${rec.target_price}, ${rec.stop_loss},
            ${rec.score}, ${JSON.stringify(rec.score_breakdown)},
            ${rec.thesis}, ${rec.catalysts}, ${rec.risks},
            ${rec.timeframe}, ${rec.week_of}, ${'active'},
            ${rec.entry_price}, ${0}, ${rec.ai_analysis}
          ) ON CONFLICT DO NOTHING
        `;
        inserted++;
      } catch (e) {
        console.error(`Seed insert error ${rec.ticker}:`, e);
      }
    }

    return NextResponse.json({ success: true, inserted });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
