// ═══════════════════════════════════════════════════════════════
//  MACRO COMBAT — Core Types
//  Hybrid: indicator loop (macro-tcg) + combat layer (YuGiOh-style)
//  Cards move indicators. Indicators affect ATK/DEF. Positions fight.
//  Traps set up macro conditions that detonate opponent strategies.
// ═══════════════════════════════════════════════════════════════

export type Desk = 'rates' | 'equities' | 'commodities' | 'fx' | 'macro';
export type Lane = 'rates' | 'equities' | 'commodities' | 'fx';
export type IndicatorKey = 'rate' | 'inflation' | 'usd' | 'risk';

export const LANES: Lane[] = ['rates', 'equities', 'commodities', 'fx'];

// ─── Macro Indicators ────────────────────────────────────────

export interface Indicators {
  rate: number;       // 0–10. Fed funds rate. Higher = tighter money.
  inflation: number;  // 0–10. CPI / price pressure.
  usd: number;        // 0–10. Dollar strength. 5 = neutral.
  risk: number;       // 0–10. Market sentiment. 0=fear, 10=greed.
}

export const STARTING_INDICATORS: Indicators = {
  rate: 4,
  inflation: 4,
  usd: 5,
  risk: 6,
};

export const INDICATOR_META: Record<IndicatorKey, { name: string; icon: string; low: string; high: string }> = {
  rate:      { name: 'Interest Rate', icon: '📊', low: 'ZIRP', high: 'Hawkish' },
  inflation: { name: 'Inflation',     icon: '🔥', low: 'Deflation', high: 'Overheating' },
  usd:       { name: 'USD Index',     icon: '💵', low: 'Weak $', high: 'Strong $' },
  risk:      { name: 'Risk Appetite', icon: '📈', low: 'Fear', high: 'Greed' },
};

// ─── Sensitivities ───────────────────────────────────────────
// How much a position's P&L (and ATK) shifts per +1 move in each indicator.

export interface Sensitivities {
  rate?: number;
  inflation?: number;
  usd?: number;
  risk?: number;
}

// ─── Trap Conditions ─────────────────────────────────────────
// Trap cards sit face-down and auto-trigger when their condition is met.

export type TrapCondition =
  | { type: 'indicator_above'; indicator: IndicatorKey; threshold: number }
  | { type: 'indicator_below'; indicator: IndicatorKey; threshold: number }
  | { type: 'opponent_plays_position' };

// ─── Card Definitions ────────────────────────────────────────

export interface CardDef {
  id: string;
  name: string;
  desk: Desk;
  // position = stays on board, earns P&L
  // catalyst = consumed on play, immediate effect
  // quickplay = like catalyst but can be activated during opponent's turn (⚡)
  // trap = set face-down, auto-triggers on condition
  type: 'position' | 'catalyst' | 'quickplay' | 'trap';
  lane: Lane | 'any';
  basePnL: number;
  cost: number;              // capital cost to play
  sensitivities?: Sensitivities;
  indicatorChanges?: Partial<Indicators>;
  laggedIndicatorChanges?: Partial<Indicators>; // fires after lagTurns (teaches policy lags)
  lagTurns?: number;                            // how many turns until lagged effect fires (default 1)
  regimeEffects?: RegimeEffect[];               // conditional overrides (teaches non-linearity)
  description: string;
  chain?: string;
  art: string;
  keywords: string[];     // 'immunity', 'short', 'em', 'stable'
  turnEffect?: string;
  quarterEndEffect?: string;
  directEffect?: string;
  trapCondition?: TrapCondition;
}

// ─── Card Instance (in-game) ─────────────────────────────────

export interface CardInstance {
  instanceId: string;
  defId: string;
  currentPnL: number;
  lane?: Lane;
  frozen?: number;      // turns remaining frozen
  faceDown?: boolean;   // true while trap/quickplay is set but not yet revealed
  leverage?: 1 | 2 | 3; // leverage multiplier for positions
}

// ─── Player State ────────────────────────────────────────────

export interface PlayerState {
  desk: Desk;
  hand: CardInstance[];
  board: Record<Lane, CardInstance[]>;
  trapZone: CardInstance[];   // face-down set cards (max 3)
  passed: boolean;
  skipsUsed: number;          // max 2 skips per quarter
  quarterWins: number;
  capital: number;            // current capital for playing cards
}

// ─── Transmission Steps (for animation) ──────────────────────

export interface TransmissionStep {
  type: 'indicator_change' | 'auto_trigger' | 'position_effect' | 'direct_effect' | 'chain_text' | 'liquidation' | 'carrying_cost';
  indicator?: IndicatorKey;
  from?: number;
  to?: number;
  reason: string;
}

// ─── Regime Effects ─────────────────────────────────────────

export interface RegimeEffect {
  condition: { indicator: IndicatorKey; op: '>=' | '<=' | '=='; value: number };
  label: string;
  indicatorOverride?: Partial<Indicators>;
  pnlModifier?: number;
  description: string;
}

// ─── Lagged Effects ─────────────────────────────────────────

export interface LaggedEffect {
  turnsRemaining: number;
  indicatorChanges: Partial<Indicators>;
  reason: string;
  sourceCardName: string;
}

// ─── Game State ──────────────────────────────────────────────

export interface GameState {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  quarter: number;
  indicators: Indicators;
  triggeredThisQuarter: string[];
  laggedEffects: LaggedEffect[];
  log: string[];
  transmissionSteps: TransmissionStep[];
  phase: 'mode_select' | 'desk_select' | 'playing' | 'quarter_end' | 'game_over';
  winner: 0 | 1 | null;
  turnNumber: number;
  maxQuarters?: number;
  difficulty: 'easy' | 'normal' | 'advanced';
  aiLevel: 'passive' | 'standard' | 'aggressive';
}

export type Action =
  | { type: 'play_card'; instanceId: string; lane: Lane; leverage?: 1 | 2 | 3 }
  | { type: 'set_card'; instanceId: string }
  | { type: 'activate_quickplay'; instanceId: string }
  | { type: 'inspect_order'; instanceId: string }
  | { type: 'skip' }
  | { type: 'pass' };

// ─── Desk Metadata ───────────────────────────────────────────

export const DESK_META: Record<Desk, { name: string; color: string; description: string; playstyle: string; art: string; homeLane: Lane | 'any' }> = {
  rates:       { name: 'Rates Desk',       color: '#2D3A5C', description: 'Bond market specialist. Watch the Fed, trade the curve.',       playstyle: 'Control', art: '📊', homeLane: 'rates' },
  equities:    { name: 'Equities Desk',    color: '#1B8A7A', description: 'Stock market player. Ride bulls, short bears.',                 playstyle: 'Aggression', art: '📈', homeLane: 'equities' },
  commodities: { name: 'Commodities Desk', color: '#C4851C', description: 'Oil, gold, metals. Profit from supply shocks.',                playstyle: 'Momentum', art: '🛢️', homeLane: 'commodities' },
  fx:          { name: 'FX Desk',          color: '#7B5EA7', description: 'Currency specialist. Carry trades and interventions.',           playstyle: 'Exploitation', art: '💱', homeLane: 'fx' },
  macro:       { name: 'Macro Desk',       color: '#D4614D', description: 'Big picture trader. Regime changes and black swans.',           playstyle: 'Adaptive', art: '🌍', homeLane: 'any' },
};

export const LANE_META: Record<Lane, { name: string; icon: string }> = {
  rates:       { name: 'Rates',          icon: '📊' },
  equities:    { name: 'Equities',       icon: '📈' },
  commodities: { name: 'Commodities',    icon: '🛢️' },
  fx:          { name: 'FX',             icon: '💱' },
};
