// ═══════════════════════════════════════════════════════════════
//  MACRO — Interactive Tutorial (Tiered)
//  Beginner / Intermediate / Advanced tutorials
// ═══════════════════════════════════════════════════════════════

import { GameState, CardInstance, Lane, Action, STARTING_INDICATORS } from './types';
import { CARD_MAP } from './cards';
import { uid } from './engine';

// ─── Step Definitions ────────────────────────────────────────

export type TutorialAction = 'play_position' | 'play_catalyst' | 'wait_ai' | 'player_pass';
export type TutorialHighlight = 'indicators' | 'ai-hand' | 'hand' | 'rates' | 'equities' | 'commodities' | 'fx' | 'pass-button';
export type TutorialLevel = 'beginner' | 'intermediate' | 'advanced';

export interface TutorialStepDef {
  id: string;
  title: string;
  body: string[];
  action?: TutorialAction;
  highlight?: TutorialHighlight;
}

// ─── Beginner Tutorial (Easy mode) ──────────────────────────
// Only Rate + Risk. No leverage. Just learn cause and effect.

const BEGINNER_STEPS: TutorialStepDef[] = [
  { id: 'b_welcome', title: 'Welcome to MACRO', body: ["You're about to learn how financial markets work — by playing a card game."] },
  { id: 'b_concept', title: 'The Core Idea', body: ["You play cards that move market indicators. Those indicators change the profit (P&L) of every position on the board."] },
  { id: 'b_win', title: 'How You Win', body: ["Have higher total P&L than the AI when both players pass. Win 2 of 3 rounds."] },

  { id: 'b_ind', title: 'Two Key Indicators', body: ["Look at the top of the screen. You'll see two gauges: Interest Rate and Risk Appetite."], highlight: 'indicators' },
  { id: 'b_rate', title: '📊 Interest Rate', body: ["When the central bank raises rates, borrowing gets expensive. Bonds benefit, stocks suffer."], highlight: 'indicators' },
  { id: 'b_risk', title: '📈 Risk Appetite', body: ["When investors feel confident (high risk), stocks go up. When they panic (low risk), stocks crash and money flows to bonds."], highlight: 'indicators' },

  { id: 'b_hand', title: 'Your Cards', body: ["You're playing the Rates Desk — bonds and monetary policy. Each card has a cost in the corner."], highlight: 'hand' },
  { id: 'b_types', title: 'Two Card Types', body: ["POSITION cards stay on the board and earn P&L. CATALYST cards fire once and change the indicators."], highlight: 'hand' },

  { id: 'b_play_intro', title: 'Step 1 — Deploy a Bond', body: ["The 10-Year Treasury earns P&L based on interest rates. When rates go up, this card makes more money."], highlight: 'hand' },
  { id: 'b_play', title: 'Step 1 — Your Move', body: ["Click the 10-Year Treasury → 'Select to Play' → click the Rates lane."], action: 'play_position', highlight: 'hand' },

  { id: 'b_deployed', title: 'Position on the Board', body: ["Your bond is deployed. See its P&L? That number changes as indicators move."], highlight: 'rates' },

  { id: 'b_cat_intro', title: 'Step 2 — Move the Market', body: ["QE Infinity is a quickplay card. It lowers rates and boosts risk appetite. Watch how that changes your bond's P&L."], highlight: 'hand' },
  { id: 'b_cat', title: 'Step 2 — Your Move', body: ["Click QE Infinity → 'Select to Play' → any lane."], action: 'play_catalyst', highlight: 'hand' },

  { id: 'b_chain', title: 'Cause and Effect', body: ["The popup showed what happened: QE → rates fell → risk rose. Your bond's P&L changed. This is how real markets work — everything is connected."] },

  { id: 'b_ai', title: "Opponent's Turn", body: ["The AI is about to play. Watch what it does to the indicators."], action: 'wait_ai', highlight: 'ai-hand' },
  { id: 'b_after_ai', title: 'The Market Moved', body: ["Both players affect the same indicators. Your opponent's plays change YOUR positions too. That's the game — positioning for what comes next."] },

  { id: 'b_yci_intro', title: 'Step 3 — Crash Risk', body: ["Yield Curve Inversion drops Risk Appetite. This hurts the AI's risk-sensitive cards."], highlight: 'hand' },
  { id: 'b_yci', title: 'Step 3 — Your Move', body: ["Click Yield Curve Inversion → 'Select to Play' → any lane."], action: 'play_catalyst', highlight: 'hand' },

  { id: 'b_ai2', title: 'AI Responds', body: ["Watch what happens next."], action: 'wait_ai', highlight: 'ai-hand' },
  { id: 'b_cascade', title: 'Cascade!', body: ["When indicators hit extremes, automatic effects fire. Risk at 0 triggers Flight to Safety — bonds gain, equities lose. You didn't play that card — the market did it."] },

  { id: 'b_pass_intro', title: 'Step 4 — Lock It In', body: ["You should be ahead. Pass to end your turn for the round."], highlight: 'pass-button' },
  { id: 'b_pass', title: 'Step 4 — Your Move', body: ["Click Pass."], action: 'player_pass', highlight: 'pass-button' },

  { id: 'b_done', title: "You've Got the Basics", body: ["Cards move indicators. Indicators move P&L. Position yourself for what's coming. That's macro trading."] },
];

// ─── Intermediate Tutorial (Normal mode) ────────────────────
// All 4 indicators. Leverage. Regime effects. Conditional orders.

const INTERMEDIATE_STEPS: TutorialStepDef[] = [
  { id: 'i_welcome', title: 'Intermediate Tutorial', body: ["You know the basics. Now let's add the mechanics that make real markets complex."] },

  { id: 'i_4ind', title: 'Four Indicators', body: ["You now see all four: Rate, Inflation, USD, and Risk. Each one affects different cards differently."], highlight: 'indicators' },
  { id: 'i_inflation', title: '🔥 Inflation', body: ["When inflation hits 7+, the central bank auto-hikes rates. At 9+, emergency hikes. Inflation cascades into rate changes."], highlight: 'indicators' },
  { id: 'i_usd', title: '💵 USD Index', body: ["A strong dollar (7+) crushes emerging market positions. Some cards profit from a weak dollar, others from a strong one."], highlight: 'indicators' },

  { id: 'i_capital', title: 'Capital', body: ["Every card costs capital to play. You earn capital each turn from your board's P&L. Spend wisely."] },

  { id: 'i_play_intro', title: 'Deploy with Leverage', body: ["When you deploy a position, you choose leverage: 1x (safe), 2x (doubled P&L), or 3x (tripled)."], highlight: 'hand' },
  { id: 'i_play', title: 'Your Move', body: ["Deploy the 10-Year Treasury → Rates lane → try 2x leverage."], action: 'play_position', highlight: 'hand' },

  { id: 'i_leverage', title: 'Leverage = Amplification', body: ["Your bond's P&L is now doubled. But if indicators turn against you, losses are doubled too."], highlight: 'rates' },

  { id: 'i_funding', title: 'Funding Costs', body: ["Every position costs capital each turn to maintain. The cost scales with the Interest Rate — high rates make everything expensive to hold."] },
  { id: 'i_margin', title: 'Margin Ratio', body: ["Your margin ratio (exposure / capital) is shown in the status bar. If it exceeds the threshold, your weakest position gets force-liquidated."] },
  { id: 'i_margin2', title: 'Dynamic Margin', body: ["The margin threshold tightens in a crisis: low risk appetite and strong dollar both lower it. The rules change when you can least afford it."] },

  { id: 'i_qe_intro', title: 'Fire QE Infinity', body: ["This quickplay has a regime effect: if rates are near zero, it has diminished returns. Context matters."], highlight: 'hand' },
  { id: 'i_qe', title: 'Your Move', body: ["Play QE Infinity → any lane."], action: 'play_catalyst', highlight: 'hand' },

  { id: 'i_regime', title: 'Regime Effects', body: ["Some cards behave differently depending on the macro environment. QE at near-zero rates = 'pushing on a string.' The same policy, different results."] },

  { id: 'i_ai', title: "Opponent's Turn", body: ["Watch the AI play."], action: 'wait_ai', highlight: 'ai-hand' },

  { id: 'i_orders', title: 'Conditional Orders', body: ["Some cards can be set face-down as conditional orders. They auto-trigger when indicator conditions are met. Like a stop-loss or take-profit in real trading."] },

  { id: 'i_yci', title: 'Crash Risk Appetite', body: ["Play Yield Curve Inversion to drop risk."], action: 'play_catalyst', highlight: 'hand' },

  { id: 'i_ai2', title: 'AI Responds', body: ["Watch for cascades."], action: 'wait_ai', highlight: 'ai-hand' },

  { id: 'i_pass', title: 'End the Round', body: ["Pass when you're ahead. You can also Skip (preserve your turn without playing) — you get 2 skips per round."], highlight: 'pass-button' },
  { id: 'i_pass_do', title: 'Your Move', body: ["Click Pass."], action: 'player_pass', highlight: 'pass-button' },

  { id: 'i_done', title: 'Ready for More', body: ["You've learned leverage, funding costs, margin, regime effects, and all 4 indicators. Try Normal mode or step up to Advanced for the full system."] },
];

// ─── Advanced Tutorial (Advanced mode) ──────────────────────
// Carrying costs, margin ratio, lagged effects. The full system.

const ADVANCED_STEPS: TutorialStepDef[] = [
  { id: 'a_welcome', title: 'Advanced Tutorial', body: ["You know funding costs and margin. Now learn the full system — FX hedging, credit spreads, and policy lags."] },

  { id: 'a_fx', title: 'FX Hedging Costs', body: ["Non-dollar positions (FX, EM, commodities) have extra funding costs when the dollar is strong. USD above 5 adds an FX hedge premium to your carry."] },
  { id: 'a_credit', title: 'Credit Spread', body: ["When risk appetite drops below 5, leveraged positions pay a credit spread premium. At risk = 0, nobody will lend — funding costs spike even if rates are low. This is 2008."] },
  { id: 'a_death', title: 'The Death Spiral', body: ["In a crisis: low risk tightens your margin threshold, credit spreads spike your costs, strong dollar adds FX hedging costs. Everything compounds. Leverage is lethal."] },

  { id: 'a_deploy', title: 'Deploy at 2x', body: ["Deploy the 10-Year Treasury at 2x leverage. Watch your margin ratio change."], highlight: 'hand' },
  { id: 'a_deploy_do', title: 'Your Move', body: ["10-Year Treasury → Rates lane → 2x."], action: 'play_position', highlight: 'hand' },

  { id: 'a_carrying', title: 'Carrying Costs', body: ["Notice the funding cost in the transmission chain each turn. At 2x leverage with rates at 4, you're paying about 0.8 capital/turn. If someone hikes rates, that cost doubles."], highlight: 'rates' },

  { id: 'a_qe', title: 'QE with Lagged Effects', body: ["QE Infinity has a LAGGED effect: Inflation +2 arrives in a few turns, not immediately. Policy lags are real — the Fed prints money today, inflation shows up months later."], highlight: 'hand' },
  { id: 'a_qe_do', title: 'Your Move', body: ["Play QE Infinity."], action: 'play_catalyst', highlight: 'hand' },

  { id: 'a_lag', title: 'Lagged Effect Queued', body: ["See the amber strip above the board? That's the pending lagged effect. In a few turns, Inflation +2 will fire automatically."] },

  { id: 'a_ai', title: "Opponent's Turn", body: ["Watch what the AI does. Pay attention to how its plays affect your funding costs."], action: 'wait_ai', highlight: 'ai-hand' },

  { id: 'a_short', title: 'Long vs Short', body: ["Some cards have negative base P&L but profit from falling indicators. CDS, VIX, Short Seller — these are crisis insurance. They cost money to hold but pay off in crashes."] },

  { id: 'a_yci', title: 'Engineer the Environment', body: ["Play Yield Curve Inversion to crash risk. If you have short-side cards, they'll profit."], action: 'play_catalyst', highlight: 'hand' },

  { id: 'a_ai2', title: 'AI Responds', body: ["Watch for cascades and margin calls."], action: 'wait_ai', highlight: 'ai-hand' },

  { id: 'a_skip', title: 'Skip vs Pass', body: ["Skip preserves your turn without playing (2 per round). Use it to wait for carrying costs to drain the opponent, or to see what the AI does next."], highlight: 'pass-button' },
  { id: 'a_pass', title: 'End the Round', body: ["Pass to lock in."], action: 'player_pass', highlight: 'pass-button' },

  { id: 'a_done', title: 'Full Trader Mode', body: ["You understand margin, funding costs, policy lags, and short-side positioning. You're ready for Advanced Quick Play and Story Mode. Good luck."] },
];

// ─── Tutorial Selection ─────────────────────────────────────

export function getTutorialSteps(level: TutorialLevel): TutorialStepDef[] {
  switch (level) {
    case 'beginner': return BEGINNER_STEPS;
    case 'intermediate': return INTERMEDIATE_STEPS;
    case 'advanced': return ADVANCED_STEPS;
  }
}

// Keep backward compat
export const TUTORIAL_STEPS = BEGINNER_STEPS;

// ─── Tutorial Game ────────────────────────────────────────────

function makeEmptyBoard(): Record<Lane, CardInstance[]> {
  return { rates: [], equities: [], commodities: [], fx: [] };
}

export function createTutorialGame(level: TutorialLevel = 'beginner'): GameState {
  const playerCardIds = [
    'rates_10y',
    'rates_qe',
    'rates_yci',
    'rates_volcker',
    'rates_tips',
    'rates_duration',
    'rates_powell',
    'rates_yellen',
    'rates_bailout',
    'rates_repo',
  ];

  const aiCardIds = [
    'eq_buffett',
    'eq_blackmonday',
    'eq_concentrated',
    'eq_short',
    'eq_gme',
    'eq_lehman',
    'eq_buyback',
    'eq_momentum',
    'eq_activist',
    'eq_dividend',
  ];

  const makeHand = (ids: string[]): CardInstance[] =>
    ids.map(defId => ({
      instanceId: uid(),
      defId,
      currentPnL: CARD_MAP[defId]?.basePnL ?? 0,
    }));

  const difficulty = level === 'beginner' ? 'easy' as const
    : level === 'intermediate' ? 'normal' as const
    : 'advanced' as const;

  const aiLevel = level === 'beginner' ? 'passive' as const
    : level === 'intermediate' ? 'standard' as const
    : 'standard' as const;

  return {
    players: [
      {
        desk: 'rates',
        hand: makeHand(playerCardIds),
        board: makeEmptyBoard(),
        trapZone: [],
        passed: false,
        skipsUsed: 0,
        quarterWins: 0,
        capital: 50,
      },
      {
        desk: 'equities',
        hand: makeHand(aiCardIds),
        board: makeEmptyBoard(),
        trapZone: [],
        passed: false,
        skipsUsed: 0,
        quarterWins: 0,
        capital: 50,
      },
    ],
    currentPlayer: 0,
    quarter: 1,
    indicators: { ...STARTING_INDICATORS },
    triggeredThisQuarter: [],
    laggedEffects: [],
    log: ['Tutorial — You play as the Rates Desk.'],
    transmissionSteps: [],
    phase: 'playing',
    winner: null,
    turnNumber: 1,
    difficulty,
    aiLevel,
  };
}

// ─── Scripted AI ──────────────────────────────────────────────

const SCRIPTED_AI_MOVES: { defId: string; lane: Lane }[] = [
  { defId: 'eq_buffett',    lane: 'equities' },
  { defId: 'eq_blackmonday', lane: 'equities' },
];

export function getTutorialAIAction(state: GameState, aiTurnIndex: number): Action {
  const move = SCRIPTED_AI_MOVES[aiTurnIndex];
  if (!move) return { type: 'pass' };

  const card = state.players[1].hand.find(c => c.defId === move.defId);
  if (!card) return { type: 'pass' };

  return { type: 'play_card', instanceId: card.instanceId, lane: move.lane };
}
