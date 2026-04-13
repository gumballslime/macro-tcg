// ═══════════════════════════════════════════════════════════════
//  MACRO v2 — Core Types
//  Cards move indicators. Indicators affect positions. Players
//  see the chain. That's how you learn macro.
// ═══════════════════════════════════════════════════════════════

export type Desk = 'rates' | 'equities' | 'commodities' | 'fx' | 'macro';
export type Lane = 'rates' | 'equities' | 'commodities' | 'fx';
export type IndicatorKey = 'rate' | 'inflation' | 'usd' | 'risk';

export const LANES: Lane[] = ['rates', 'equities', 'commodities', 'fx'];

// ─── Macro Indicators ────────────────────────────────────────

export interface Indicators {
  rate: number;       // 0–5. Fed funds rate. Higher = tighter money.
  inflation: number;  // 0–5. CPI / price pressure.
  usd: number;        // 0–5. Dollar strength. 3 = neutral.
  risk: number;       // 0–5. Market sentiment. 0=fear, 5=greed.
}

export const STARTING_INDICATORS: Indicators = {
  rate: 2,
  inflation: 2,
  usd: 3,
  risk: 3,
};

export const INDICATOR_META: Record<IndicatorKey, { name: string; icon: string; low: string; high: string }> = {
  rate:      { name: 'Interest Rate', icon: '📊', low: 'ZIRP', high: 'Hawkish' },
  inflation: { name: 'Inflation',     icon: '🔥', low: 'Deflation', high: 'Overheating' },
  usd:       { name: 'USD Index',     icon: '💵', low: 'Weak $', high: 'Strong $' },
  risk:      { name: 'Risk Appetite', icon: '📈', low: 'Fear', high: 'Greed' },
};

// ─── Sensitivities ───────────────────────────────────────────
// How much a position's P&L changes per +1 move in each indicator
// (relative to starting values — at game start, sensitivity contribution = 0)

export interface Sensitivities {
  rate?: number;
  inflation?: number;
  usd?: number;
  risk?: number;
}

// ─── Card Definitions ────────────────────────────────────────

export interface CardDef {
  id: string;
  name: string;
  desk: Desk;
  type: 'position' | 'catalyst';
  lane: Lane | 'any';
  basePnL: number;
  sensitivities?: Sensitivities;
  indicatorChanges?: Partial<Indicators>;       // how this card moves indicators (catalysts + some deploys)
  description: string;
  chain?: string;                                // transmission chain explanation
  art: string;
  keywords: string[];                            // 'immunity', 'short', 'em', 'stable'
  turnEffect?: string;                           // e.g. 'growth_2', 'growth_1', 'random_indicator', 'chaos'
  quarterEndEffect?: string;                     // e.g. 'destroy_40', 'destroy_70_risk'
  directEffect?: string;                         // special catalyst effects beyond indicators
}

// ─── Card Instance (in-game) ─────────────────────────────────

export interface CardInstance {
  instanceId: string;
  defId: string;
  currentPnL: number;    // starts at basePnL, modified only by direct effects
  lane?: Lane;
  frozen?: number;       // turns remaining of sanctions freeze
}

// ─── Player State ────────────────────────────────────────────

export interface PlayerState {
  desk: Desk;
  hand: CardInstance[];
  board: Record<Lane, CardInstance[]>;
  passed: boolean;
  quarterWins: number;
}

// ─── Transmission Steps (for animation) ──────────────────────

export interface TransmissionStep {
  type: 'indicator_change' | 'auto_trigger' | 'position_effect' | 'direct_effect' | 'chain_text';
  indicator?: IndicatorKey;
  from?: number;
  to?: number;
  reason: string;
}

// ─── Game State ──────────────────────────────────────────────

export interface GameState {
  players: [PlayerState, PlayerState];
  currentPlayer: 0 | 1;
  quarter: number;
  indicators: Indicators;
  triggeredThisQuarter: string[];
  log: string[];
  transmissionSteps: TransmissionStep[];
  phase: 'mode_select' | 'desk_select' | 'playing' | 'quarter_end' | 'game_over';
  winner: 0 | 1 | null;
  turnNumber: number;
}

export type Action =
  | { type: 'play_card'; instanceId: string; lane: Lane }
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
