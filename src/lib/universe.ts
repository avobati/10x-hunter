// Curated scan universe — 80 high-potential small/mid-cap growth stocks
// Updated May 2026 — used for Quick Rescan and as seed for full-market scan
export const SCAN_UNIVERSE: Array<{ ticker: string; name: string; sector: string }> = [
  // AI / Machine Learning
  { ticker: "SOUN",  name: "SoundHound AI",            sector: "Technology"  },
  { ticker: "BBAI",  name: "BigBear.ai",                sector: "Technology"  },
  { ticker: "PLTR",  name: "Palantir Technologies",     sector: "Technology"  },
  { ticker: "ALAB",  name: "Astera Labs",               sector: "Technology"  },
  { ticker: "SMCI",  name: "Super Micro Computer",      sector: "Technology"  },
  { ticker: "CRDO",  name: "Credo Technology",          sector: "Technology"  },
  { ticker: "KVYO",  name: "Klaviyo Inc",               sector: "Technology"  },
  // Quantum Computing
  { ticker: "IONQ",  name: "IonQ Inc",                  sector: "Technology"  },
  { ticker: "RGTI",  name: "Rigetti Computing",         sector: "Technology"  },
  { ticker: "QBTS",  name: "D-Wave Quantum",            sector: "Technology"  },
  // Space / Defense
  { ticker: "RKLB",  name: "Rocket Lab USA",            sector: "Industrials" },
  { ticker: "ASTS",  name: "AST SpaceMobile",           sector: "Industrials" },
  { ticker: "LUNR",  name: "Intuitive Machines",        sector: "Industrials" },
  { ticker: "KTOS",  name: "Kratos Defense",            sector: "Industrials" },
  { ticker: "SPCE",  name: "Virgin Galactic",           sector: "Industrials" },
  // eVTOL / Autonomous
  { ticker: "JOBY",  name: "Joby Aviation",             sector: "Industrials" },
  { ticker: "ACHR",  name: "Archer Aviation",           sector: "Industrials" },
  { ticker: "LIDR",  name: "AEye Inc",                  sector: "Technology"  },
  // Healthcare / Biotech
  { ticker: "HIMS",  name: "Hims & Hers Health",        sector: "Healthcare"  },
  { ticker: "ADMA",  name: "ADMA Biologics",            sector: "Healthcare"  },
  { ticker: "ACMR",  name: "ACM Research",              sector: "Healthcare"  },
  { ticker: "TMDX",  name: "TransMedics Group",         sector: "Healthcare"  },
  { ticker: "RXRX",  name: "Recursion Pharma",          sector: "Healthcare"  },
  { ticker: "BEAM",  name: "Beam Therapeutics",         sector: "Healthcare"  },
  { ticker: "EDIT",  name: "Editas Medicine",           sector: "Healthcare"  },
  { ticker: "VERV",  name: "Verve Therapeutics",        sector: "Healthcare"  },
  // Fintech
  { ticker: "AFRM",  name: "Affirm Holdings",           sector: "Financials"  },
  { ticker: "UPST",  name: "Upstart Holdings",          sector: "Financials"  },
  { ticker: "SOFI",  name: "SoFi Technologies",         sector: "Financials"  },
  { ticker: "HOOD",  name: "Robinhood Markets",         sector: "Financials"  },
  { ticker: "DAVE",  name: "Dave Inc",                  sector: "Financials"  },
  { ticker: "STEP",  name: "StepStone Group",           sector: "Financials"  },
  // Crypto / Bitcoin Miners
  { ticker: "MARA",  name: "Marathon Digital",          sector: "Technology"  },
  { ticker: "CLSK",  name: "CleanSpark",                sector: "Technology"  },
  { ticker: "WULF",  name: "TeraWulf",                  sector: "Technology"  },
  { ticker: "MSTR",  name: "MicroStrategy",             sector: "Technology"  },
  { ticker: "CIFR",  name: "Cipher Mining",             sector: "Technology"  },
  { ticker: "BTBT",  name: "Bit Digital",               sector: "Technology"  },
  // Clean Energy
  { ticker: "PLUG",  name: "Plug Power",                sector: "Energy"      },
  { ticker: "BE",    name: "Bloom Energy",              sector: "Energy"      },
  { ticker: "FCEL",  name: "FuelCell Energy",           sector: "Energy"      },
  { ticker: "CHPT",  name: "ChargePoint Holdings",      sector: "Energy"      },
  { ticker: "EVGO",  name: "EVgo Inc",                  sector: "Energy"      },
  { ticker: "BLNK",  name: "Blink Charging",           sector: "Energy"      },
  // Consumer / Social
  { ticker: "RDDT",  name: "Reddit Inc",                sector: "Technology"  },
  { ticker: "CELH",  name: "Celsius Holdings",         sector: "Consumer"    },
  { ticker: "XPOF",  name: "Xponential Fitness",        sector: "Consumer"    },
  // EV
  { ticker: "RIVN",  name: "Rivian Automotive",         sector: "Consumer"    },
  { ticker: "LCID",  name: "Lucid Group",               sector: "Consumer"    },
  { ticker: "NKLA",  name: "Nikola Corp",               sector: "Industrials" },
  // Semis
  { ticker: "LSCC",  name: "Lattice Semiconductor",     sector: "Technology"  },
  { ticker: "CAMT",  name: "Camtek Ltd",                sector: "Technology"  },
  { ticker: "AEHR",  name: "Aehr Test Systems",         sector: "Technology"  },
  { ticker: "FORM",  name: "FormFactor Inc",            sector: "Technology"  },
  // Cybersecurity
  { ticker: "CRWD",  name: "CrowdStrike",               sector: "Technology"  },
  { ticker: "S",     name: "SentinelOne",               sector: "Technology"  },
  { ticker: "CYBR",  name: "CyberArk Software",         sector: "Technology"  },
  // Cloud / SaaS
  { ticker: "DDOG",  name: "Datadog Inc",               sector: "Technology"  },
  { ticker: "NET",   name: "Cloudflare Inc",            sector: "Technology"  },
  { ticker: "GTLB",  name: "GitLab Inc",                sector: "Technology"  },
  { ticker: "MNDY",  name: "Monday.com",                sector: "Technology"  },
  // Biotech / Genomics
  { ticker: "PAC",   name: "Pacific Biosciences",       sector: "Healthcare"  },
  { ticker: "SDGR",  name: "Schrödinger Inc",           sector: "Healthcare"  },
  { ticker: "EXAI",  name: "Exscientia",                sector: "Healthcare"  },
  // Misc high-momentum
  { ticker: "KOPN",  name: "Kopin Corporation",         sector: "Technology"  },
  { ticker: "MVST",  name: "Microvast Holdings",        sector: "Technology"  },
  { ticker: "CLOV",  name: "Clover Health",             sector: "Healthcare"  },
  { ticker: "ATER",  name: "Aterian Inc",               sector: "Consumer"    },
  { ticker: "MAXN",  name: "Maxeon Solar",              sector: "Energy"      },
  { ticker: "TALK",  name: "Talkspace",                 sector: "Healthcare"  },
  { ticker: "GROV",  name: "Grove Collaborative",       sector: "Consumer"    },
];
