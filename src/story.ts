// ═══════════════════════════════════════════════════════════════
//  MACRO — Story Mode: Financial History Campaign
//  7 chapters. Survival-based. Deck building between rounds.
//  Player learns how assets perform in different regimes.
// ═══════════════════════════════════════════════════════════════

import { GameState, CardInstance, Indicators, Desk, Lane } from './types';
import { CARD_MAP, getCardsForDesk, ALL_CARDS } from './cards';
import { uid, makeEmptyBoard, shuffle } from './engine';

// ─── Types ──────────────────────────────────────────────────

export interface StoryChapter {
  id: string;
  year: number;
  title: string;
  subtitle: string;
  narrative: string[];
  regimeBriefing: string[];   // explicit guidance on what the indicators mean
  epilogue: string[];
  startingIndicators: Indicators;
  mission: string;
  rewardPool: string[];       // cross-desk rewards
  rewardCount: number;
  aiAggression: number;
}

export interface StoryState {
  currentChapter: number;
  playerDesk: Desk;
  deck: string[];
  capital: number;
  results: ChapterResult[];
  aiDesk?: Desk;              // random each chapter
}

export interface ChapterResult {
  won: boolean;
  pScore: number;
  aScore: number;
}

// ─── Chapters ───────────────────────────────────────────────

export const CHAPTERS: StoryChapter[] = [
  {
    id: 'nixon',
    year: 1971,
    title: 'Nixon Shock',
    subtitle: 'End of the gold standard',
    narrative: [
      'August 15, 1971. President Nixon announces the US will no longer convert dollars to gold.',
      'The Bretton Woods system — the foundation of post-war global finance — collapses overnight.',
      'The dollar is about to plunge. Gold is about to soar. Currency markets are in chaos.',
    ],
    regimeBriefing: [
      '📊 Rate: 2 (low) — borrowing is cheap. Leverage is affordable.',
      '🔥 Inflation: 2 (low now) — but about to rise as the dollar weakens.',
      '💵 USD: 8 (very strong) — but the peg is breaking. Expect a collapse.',
      '📈 Risk: 5 (neutral) — uncertainty, not panic.',
      '',
      '💡 Strategy: Gold and commodities benefit from inflation and a weakening dollar. Bond positions with rate sensitivity are safe. Avoid anything that needs a strong dollar.',
    ],
    epilogue: [
      'The gold window is closed forever. Fiat currency becomes the new normal.',
      'Inflation begins its long climb through the 1970s.',
    ],
    startingIndicators: { rate: 2, inflation: 2, usd: 8, risk: 5 },
    mission: 'Survive the dollar collapse',
    rewardPool: ['comm_gold', 'fx_soros', 'rates_tips', 'comm_oil', 'comm_agri'],
    rewardCount: 3,
    aiAggression: 0.3,
  },
  {
    id: 'volcker',
    year: 1979,
    title: 'Volcker Shock',
    subtitle: 'Crushing inflation at any cost',
    narrative: [
      'October 1979. Paul Volcker takes the chair at the Federal Reserve.',
      'Inflation is running at 13%. The economy is overheating. Confidence in the dollar is crumbling.',
      'Volcker announces he will hike rates as high as needed. He means it.',
    ],
    regimeBriefing: [
      '📊 Rate: 3 (rising fast) — Volcker is about to push this to extremes.',
      '🔥 Inflation: 9 (critical) — this will trigger auto-hikes at 7+.',
      '💵 USD: 4 (weak) — but rate hikes will strengthen it.',
      '📈 Risk: 3 (low) — recession fears are real.',
      '',
      '💡 Strategy: Cards with positive rate sensitivity will thrive as rates skyrocket. Duration Play (+4 rate sens) is a monster here. Equities and risk-sensitive positions will get crushed. Leverage is expensive — rates are climbing.',
    ],
    epilogue: [
      'Volcker raised rates to 20%. Inflation broke. The economy entered a deep recession.',
      'But the foundation was set for the great bull market of the 1980s.',
    ],
    startingIndicators: { rate: 3, inflation: 9, usd: 4, risk: 3 },
    mission: 'Profit from the rate supercycle',
    rewardPool: ['rates_volcker', 'rates_duration', 'rates_hy', 'rates_reit', 'comm_gold'],
    rewardCount: 3,
    aiAggression: 0.4,
  },
  {
    id: 'asian_crisis',
    year: 1997,
    title: 'Asian Financial Crisis',
    subtitle: 'Contagion across emerging markets',
    narrative: [
      'July 1997. The Thai baht collapses. Then the Indonesian rupiah. Then the Korean won.',
      'A strong dollar is crushing emerging market debt. Capital flight accelerates.',
      'The IMF scrambles to contain the damage.',
    ],
    regimeBriefing: [
      '📊 Rate: 5 (moderate) — not the main driver here.',
      '🔥 Inflation: 3 (low) — this isn\'t an inflation crisis.',
      '💵 USD: 8 (very strong) — the dollar wrecking ball. USD ≥ 7 crushes EM positions.',
      '📈 Risk: 4 (cautious) — could collapse further.',
      '',
      '💡 Strategy: Avoid "em" tagged positions — they\'ll get crushed by the strong dollar. Gold is a safe haven (negative USD sensitivity helps). FX cards that weaken the dollar are powerful here. Watch for the flight-to-safety cascade if risk hits 0.',
    ],
    epilogue: [
      'The crisis spread from Thailand to Russia to Brazil. Trillions in wealth destroyed.',
      'The lesson: currency pegs break, and when they do, contagion is unstoppable.',
    ],
    startingIndicators: { rate: 5, inflation: 3, usd: 8, risk: 4 },
    mission: 'Survive the dollar wrecking ball',
    rewardPool: ['fx_em_debt', 'fx_chf', 'macro_cds', 'fx_carry', 'comm_gold'],
    rewardCount: 3,
    aiAggression: 0.5,
  },
  {
    id: 'dotcom',
    year: 2000,
    title: 'Dot-Com Bubble',
    subtitle: 'Irrational exuberance',
    narrative: [
      'March 2000. The NASDAQ hits 5,048. Companies with no revenue are worth billions.',
      'Alan Greenspan warned about "irrational exuberance" years ago. Nobody listened.',
      'Risk appetite is at maximum. The bubble is about to pop.',
    ],
    regimeBriefing: [
      '📊 Rate: 4 (neutral) — Fed hasn\'t tightened yet.',
      '🔥 Inflation: 3 (benign) — not a concern.',
      '💵 USD: 5 (neutral) — not a factor.',
      '📈 Risk: 9 (extreme greed) — euphoria territory. One bad card and this cascades.',
      '',
      '💡 Strategy: Risk at 9 means equities are booming but fragile. Cards with negative risk sensitivity (Short Seller) will print money when the crash comes. The question is timing — do you ride the bubble or bet against it? Leverage is cheap (low rates) but dangerous (the crash will be violent).',
    ],
    epilogue: [
      'The NASDAQ lost 78% of its value. Pets.com, Webvan, WorldCom — all gone.',
      'The survivors (Amazon, eBay) went on to dominate. Timing was everything.',
    ],
    startingIndicators: { rate: 4, inflation: 3, usd: 5, risk: 9 },
    mission: 'Time the exit',
    rewardPool: ['eq_crypto', 'eq_vc', 'macro_vix', 'eq_index', 'macro_cds'],
    rewardCount: 4,
    aiAggression: 0.6,
  },
  {
    id: 'gfc',
    year: 2008,
    title: 'Global Financial Crisis',
    subtitle: 'Too big to fail',
    narrative: [
      'September 2008. Lehman Brothers files for bankruptcy. The world holds its breath.',
      'Mortgage-backed securities are toxic. Banks stop lending to each other.',
      'The Fed will slash rates to zero. Congress will pass TARP. But first — the crash.',
    ],
    regimeBriefing: [
      '📊 Rate: 6 (elevated) — the Fed will be forced to cut aggressively.',
      '🔥 Inflation: 5 (moderate) — will collapse as demand evaporates.',
      '💵 USD: 5 (neutral) — flight to safety will strengthen it.',
      '📈 Risk: 3 (fear) — already low. Could hit 0 and trigger Flight to Safety.',
      '',
      '💡 Strategy: Rates positions with positive rate sensitivity will benefit from emergency cuts. The flight-to-safety cascade (Risk=0) gives Rates +3 and Equities −3. Play bailout cards at the right time. MBS is toxic if rates spike further. Leverage is dangerous — carrying costs are high with rate at 6.',
    ],
    epilogue: [
      'The Fed cut rates to zero and launched QE. TARP passed. The system survived.',
      'But the scars run deep. Trust in institutions was shattered.',
    ],
    startingIndicators: { rate: 6, inflation: 5, usd: 5, risk: 3 },
    mission: 'Survive the crash, profit from the bailout',
    rewardPool: ['macro_cds', 'rates_cdo', 'macro_vix', 'macro_distressed', 'rates_bailout'],
    rewardCount: 4,
    aiAggression: 0.7,
  },
  {
    id: 'covid',
    year: 2020,
    title: 'COVID Crash & Stimulus',
    subtitle: 'Fastest crash and recovery in history',
    narrative: [
      'March 2020. COVID-19 shuts down the global economy. Markets crash 34% in 23 days.',
      'The Fed cuts rates to zero. Congress passes $2.2 trillion in stimulus.',
      'The everything rally begins. But at what cost?',
    ],
    regimeBriefing: [
      '📊 Rate: 4 (about to be cut to zero) — rate-cut cards are powerful.',
      '🔥 Inflation: 3 (low now) — but lagged effects from stimulus will push it up.',
      '💵 USD: 5 (neutral) — money printing will weaken it.',
      '📈 Risk: 7 (recovering) — stimulus is fueling a risk rally.',
      '',
      '💡 Strategy: Play stimulus cards for the immediate risk boost — but watch for the LAGGED inflation that follows. QE and Bailout cards have delayed inflation effects. Leverage is cheap now but if inflation surges later, rates will auto-hike and your carrying costs spike. The trap is thinking free money has no consequences.',
    ],
    epilogue: [
      'Markets recovered in record time. But the trillions in stimulus planted the seeds of inflation.',
      'By 2021, supply chains were broken and prices were rising everywhere.',
    ],
    startingIndicators: { rate: 4, inflation: 3, usd: 5, risk: 7 },
    mission: 'Ride stimulus without getting caught by lagged inflation',
    rewardPool: ['eq_crypto', 'eq_pe', 'eq_vc', 'comm_uranium', 'rates_tbill'],
    rewardCount: 4,
    aiAggression: 0.8,
  },
  {
    id: 'inflation_crisis',
    year: 2022,
    title: 'Inflation Crisis',
    subtitle: 'The bill comes due',
    narrative: [
      '2022. Inflation hits 9.1% — the highest in 40 years.',
      'The Fed begins the most aggressive hiking cycle since Volcker. 75 basis points at a time.',
      'Crypto crashes. Tech valuations collapse. The UK pension system nearly fails.',
      'This is the final chapter.',
    ],
    regimeBriefing: [
      '📊 Rate: 2 (about to skyrocket) — the Fed will hike aggressively.',
      '🔥 Inflation: 9 (critical) — will trigger auto rate hikes at 7+ and 9+.',
      '💵 USD: 7 (strong and rising) — dollar milkshake territory. EM positions get crushed.',
      '📈 Risk: 4 (fragile) — rate hikes will push this lower.',
      '',
      '💡 Strategy: This is a stagflation setup. Inflation auto-triggers will hike rates, which will crush risk. Gold thrives (inflation hedge activates at 8+). Rate-sensitive bonds benefit from the hikes. Equities and leverage are death traps — carrying costs will explode as rates climb. Cash is a position.',
    ],
    epilogue: [
      'The Fed hiked from 0% to 5.5%. Inflation slowly came down. The economy bent but didn\'t break.',
      'You survived the full cycle of financial history. The lessons of macro are yours.',
    ],
    startingIndicators: { rate: 2, inflation: 9, usd: 7, risk: 4 },
    mission: 'Survive the tightening cycle',
    rewardPool: [],
    rewardCount: 0,
    aiAggression: 0.9,
  },
];

// ─── Story Game Creation ────────────────────────────────────

function randomDesk(): Desk {
  const desks: Desk[] = ['rates', 'equities', 'commodities', 'fx', 'macro'];
  return desks[Math.floor(Math.random() * desks.length)];
}

export function createStoryGame(
  chapter: StoryChapter,
  playerDeck: string[],
  playerDesk: Desk,
  playerCapital: number,
  difficulty: GameState['difficulty'] = 'normal',
  aiLevel: GameState['aiLevel'] = 'standard',
): { game: GameState; aiDesk: Desk } {
  const playerHand: CardInstance[] = playerDeck.map(defId => ({
    instanceId: uid(),
    defId,
    currentPnL: CARD_MAP[defId]?.basePnL ?? 0,
  }));

  // Random AI desk each chapter
  const aiDesk = randomDesk();
  const aiPool = aiDesk === 'macro'
    ? shuffle(ALL_CARDS)
    : [...getCardsForDesk(aiDesk), ...shuffle(getCardsForDesk('macro')).slice(0, 3)];
  const aiHand: CardInstance[] = shuffle(aiPool).slice(0, 10).map(def => ({
    instanceId: uid(),
    defId: def.id,
    currentPnL: def.basePnL,
  }));

  return {
    aiDesk,
    game: {
      players: [
        { desk: playerDesk, hand: playerHand, board: makeEmptyBoard(), trapZone: [], passed: false, skipsUsed: 0, quarterWins: 0, capital: playerCapital },
        { desk: aiDesk, hand: aiHand, board: makeEmptyBoard(), trapZone: [], passed: false, skipsUsed: 0, quarterWins: 0, capital: 10 },
      ],
      currentPlayer: 0,
      quarter: 1,
      indicators: { ...chapter.startingIndicators },
      triggeredThisQuarter: [],
      laggedEffects: [],
      log: [`${chapter.year} — ${chapter.title}. ${chapter.mission}.`],
      transmissionSteps: [],
      phase: 'playing',
      winner: null,
      turnNumber: 1,
      maxQuarters: 3,
      difficulty,
      aiLevel,
    },
  };
}

// ─── Story AI ───────────────────────────────────────────────

import { getAIAction } from './ai';
import { Action } from './types';

export function getStoryAIAction(state: GameState, aggression: number): Action {
  if (aggression < 0.5 && Math.random() > aggression + 0.2) {
    const ai = state.players[state.currentPlayer];
    const affordable = ai.hand.filter(c => {
      const d = CARD_MAP[c.defId];
      return d && d.cost <= ai.capital;
    });
    if (affordable.length > 0) {
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      const def = CARD_MAP[pick.defId];
      const lane = def?.lane === 'any'
        ? (['rates', 'equities', 'commodities', 'fx'] as const)[Math.floor(Math.random() * 4)]
        : (def?.lane ?? 'rates');
      return { type: 'play_card', instanceId: pick.instanceId, lane };
    }
  }
  return getAIAction(state);
}

// ─── Initial Deck ───────────────────────────────────────────

export function getStartingDeck(desk: Desk): string[] {
  return getCardsForDesk(desk).map(c => c.id);
}
