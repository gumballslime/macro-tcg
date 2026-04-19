// ═══════════════════════════════════════════════════════════════
//  MACRO — Game Engine
//  Indicator loop + leverage + capital + policy lags.
//  Traps (conditional orders) auto-detonate on macro conditions.
// ═══════════════════════════════════════════════════════════════

import {
  GameState, PlayerState, CardInstance, Indicators,
  IndicatorKey, Lane, Desk, Action, TransmissionStep,
  STARTING_INDICATORS, LANES, CardDef, RegimeEffect,
} from './types';
import { ALL_CARDS, CARD_MAP, getCardsForDesk } from './cards';

const HAND_SIZE = 10;
const MAX_HAND = 10;
const MAX_BOARD_POSITIONS = 5;
const QUARTERS_TO_WIN = 2;
const MAX_QUARTERS = 3;
const INDICATOR_MIN = 0;
const INDICATOR_MAX = 10;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clampIndicator(value: number): number {
  return clamp(value, INDICATOR_MIN, INDICATOR_MAX);
}

// ─── P&L ────────────────────────────────────────────────────

export function effectivePnL(card: CardInstance, indicators: Indicators): number {
  const def = CARD_MAP[card.defId];
  if (!def) return card.currentPnL;
  const sens = def.sensitivities;
  let bonus = 0;
  if (sens) {
    const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
    for (const k of keys) {
      const s = sens[k];
      if (s) bonus += s * (indicators[k] - STARTING_INDICATORS[k]);
    }
  }
  const unleveraged = card.currentPnL + bonus;
  const leverage = card.leverage ?? 1;
  return unleveraged * leverage;
}


export function playerScore(player: PlayerState, indicators: Indicators): number {
  let total = 0;
  for (const lane of LANES) {
    for (const card of player.board[lane]) {
      total += effectivePnL(card, indicators);
    }
  }
  return total;
}

// ─── Indicator Change + Auto-Triggers ────────────────────────

interface IndicatorChangeResult {
  indicators: Indicators;
  steps: TransmissionStep[];
  triggered: string[];
}

function applyIndicatorChange(
  indicators: Indicators,
  key: IndicatorKey,
  delta: number,
  reason: string,
  alreadyTriggered: string[],
): IndicatorChangeResult {
  const steps: TransmissionStep[] = [];
  const triggered = [...alreadyTriggered];
  const from = indicators[key];
  const to = clampIndicator(from + delta);
  if (from === to) return { indicators, steps, triggered };
  const newIndicators = { ...indicators, [key]: to };
  steps.push({ type: 'indicator_change', indicator: key, from, to, reason });
  return checkAutoTriggers(newIndicators, steps, triggered);
}

function autoTrigger(ind: Indicators, allSteps: TransmissionStep[], allTriggered: string[],
  id: string, check: boolean, key: IndicatorKey, delta: number, reason: string) {
  if (!check || allTriggered.includes(id)) return;
  allTriggered.push(id);
  const from = ind[key]; const to = clampIndicator(from + delta);
  if (from === to) return;
  ind[key] = to;
  allSteps.push({ type: 'auto_trigger', indicator: key, from, to, reason });
  const sub = checkAutoTriggers({ ...ind }, [], allTriggered);
  Object.assign(ind, sub.indicators); allSteps.push(...sub.steps);
  sub.triggered.forEach(t => { if (!allTriggered.includes(t)) allTriggered.push(t); });
}

function checkAutoTriggers(
  indicators: Indicators,
  steps: TransmissionStep[],
  triggered: string[],
): IndicatorChangeResult {
  const ind = { ...indicators };
  const allSteps = [...steps];
  const allTriggered = [...triggered];

  // Inflation → central bank hikes
  autoTrigger(ind, allSteps, allTriggered, 'inflation_rate_hike',
    ind.inflation >= 7, 'rate', 1, 'Inflation ≥ 7 → Central bank forced to hike rates');
  autoTrigger(ind, allSteps, allTriggered, 'hyperinflation',
    ind.inflation >= 9, 'rate', 2, 'Inflation ≥ 9 → Emergency rate hikes (hyperinflation)');

  // High rates → risk off
  autoTrigger(ind, allSteps, allTriggered, 'rate_risk_down',
    ind.rate >= 7, 'risk', -1, 'Interest Rate ≥ 7 → Tight money kills animal spirits');
  autoTrigger(ind, allSteps, allTriggered, 'overtightening',
    ind.rate >= 9, 'risk', -2, 'Interest Rate ≥ 9 → Over-tightening crushes risk appetite');

  // ZIRP → risk on + asset inflation
  autoTrigger(ind, allSteps, allTriggered, 'zirp_risk_up',
    ind.rate === 0, 'risk', 1, 'Interest Rate at 0 → ZIRP pushes investors into risky assets');
  autoTrigger(ind, allSteps, allTriggered, 'zirp_inflation',
    ind.rate <= 1, 'inflation', 1, 'Interest Rate ≤ 1 → Easy money fuels asset inflation');

  // USD → EM effects
  if (ind.usd >= 7 && !allTriggered.includes('usd_em_crush')) {
    allTriggered.push('usd_em_crush');
    allSteps.push({ type: 'position_effect', reason: 'USD ≥ 7 → Strong dollar crushes emerging market positions (−2 P&L)' });
  }
  if (ind.usd >= 9 && !allTriggered.includes('dollar_milkshake')) {
    allTriggered.push('dollar_milkshake');
    allSteps.push({ type: 'position_effect', reason: 'USD ≥ 9 → Dollar milkshake: all positions −1 P&L' });
  }

  // Risk extremes
  if (ind.risk === 0 && !allTriggered.includes('flight_to_safety')) {
    allTriggered.push('flight_to_safety');
    allSteps.push({ type: 'position_effect', reason: 'Risk Appetite at 0 → Flight to safety: Rates +3, Equities −3' });
  }
  if (ind.risk >= 10 && !allTriggered.includes('euphoria')) {
    allTriggered.push('euphoria');
    allSteps.push({ type: 'position_effect', reason: 'Risk Appetite at 10 → Euphoria: Equities +3, Rates −2' });
  }

  return { indicators: ind, steps: allSteps, triggered: allTriggered };
}

function applyPositionEffects(players: [PlayerState, PlayerState], triggered: string[]): TransmissionStep[] {
  const steps: TransmissionStep[] = [];

  if (triggered.includes('usd_em_crush')) {
    for (const p of players) {
      for (const lane of LANES) {
        for (const card of p.board[lane]) {
          const def = CARD_MAP[card.defId];
          if (def?.keywords.includes('em') && !card.frozen) {
            card.currentPnL -= 2;
            steps.push({ type: 'position_effect', reason: `${def.name} (EM) −2 from strong dollar` });
          }
        }
      }
    }
  }

  if (triggered.includes('dollar_milkshake')) {
    for (const p of players) {
      for (const lane of LANES) {
        for (const card of p.board[lane]) {
          if (!card.frozen) {
            card.currentPnL -= 1;
            steps.push({ type: 'position_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} −1 (dollar milkshake)` });
          }
        }
      }
    }
  }

  if (triggered.includes('flight_to_safety')) {
    for (const p of players) {
      for (const card of p.board.rates) { if (!card.frozen) { card.currentPnL += 3; steps.push({ type: 'position_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} +3 (flight to safety)` }); } }
      for (const card of p.board.equities) { if (!card.frozen) { card.currentPnL -= 3; steps.push({ type: 'position_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} −3 (flight to safety)` }); } }
    }
  }

  if (triggered.includes('euphoria')) {
    for (const p of players) {
      for (const card of p.board.equities) { if (!card.frozen) { card.currentPnL += 3; steps.push({ type: 'position_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} +3 (euphoria)` }); } }
      for (const card of p.board.rates) { if (!card.frozen) { card.currentPnL -= 2; steps.push({ type: 'position_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} −2 (euphoria)` }); } }
    }
  }

  return steps;
}

// ─── Direct Effects ──────────────────────────────────────────

function resolveDirectEffect(effect: string, state: GameState, playerIdx: 0 | 1): TransmissionStep[] {
  const steps: TransmissionStep[] = [];
  const opponent = playerIdx === 0 ? 1 : 0;

  switch (effect) {
    case 'destroy_shorts': {
      for (const p of state.players) for (const lane of LANES) {
        p.board[lane] = p.board[lane].filter(c => { const def = CARD_MAP[c.defId]; if (def?.keywords.includes('short')) { steps.push({ type: 'direct_effect', reason: `${def.name} squeezed and destroyed!` }); return false; } return true; });
      }
      break;
    }
    case 'equities_boost_2': case 'equities_boost_1': {
      const amount = effect === 'equities_boost_2' ? 2 : 1;
      for (const card of state.players[playerIdx].board.equities) { if (!card.frozen) { card.currentPnL += amount; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} +${amount}` }); } }
      break;
    }
    case 'commodities_boost_2': {
      for (const card of state.players[playerIdx].board.commodities) { if (!card.frozen) { card.currentPnL += 2; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} +2` }); } }
      break;
    }
    case 'buyback': {
      for (const card of state.players[playerIdx].board.equities) { if (!card.frozen) { card.currentPnL += 2; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} +2 (buyback)` }); } }
      const opp = playerIdx === 0 ? 1 : 0;
      state.players[opp].capital = Math.max(0, state.players[opp].capital - 2);
      steps.push({ type: 'direct_effect', reason: `Opponent capital −2 (capital returned to shareholders)` });
      break;
    }
    case 'boost_equities_3': {
      const eqCards = state.players[playerIdx].board.equities.filter(c => !c.frozen);
      if (eqCards.length > 0) { const best = eqCards.reduce((a, b) => effectivePnL(a, state.indicators) >= effectivePnL(b, state.indicators) ? a : b); best.currentPnL += 3; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[best.defId]?.name ?? 'Position'} +3 (activist)` }); }
      break;
    }
    case 'fx_chaos': {
      for (let pi = 0; pi < 2; pi++) {
        const fxCards = state.players[pi as 0|1].board.fx.filter(c => !c.frozen);
        if (fxCards.length > 0) { const best = fxCards.reduce((a, b) => effectivePnL(a, state.indicators) >= effectivePnL(b, state.indicators) ? a : b); const delta = Math.random() < 0.5 ? 4 : -4; best.currentPnL += delta; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[best.defId]?.name ?? 'FX'} ${delta > 0 ? '+' : ''}${delta} (CHF chaos)` }); }
      }
      break;
    }
    case 'stable_minus_2': {
      for (const p of state.players) for (const lane of LANES) for (const card of p.board[lane]) { const def = CARD_MAP[card.defId]; if (def?.keywords.includes('stable') && !card.frozen) { card.currentPnL -= 2; steps.push({ type: 'direct_effect', reason: `${def.name} −2 (stability shattered)` }); } }
      break;
    }
    case 'reset_indicators': {
      const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
      for (const k of keys) { const current = state.indicators[k]; const neutral = k === 'usd' || k === 'risk' ? 3 : 2; if (current !== neutral) { const from = current; state.indicators[k] = neutral; steps.push({ type: 'direct_effect', indicator: k, from, to: neutral, reason: `${k} reset (Bretton Woods)` }); } }
      break;
    }
    case 'swap_rate_inflation': {
      const or = state.indicators.rate; const oi = state.indicators.inflation;
      state.indicators.rate = oi; state.indicators.inflation = or;
      steps.push({ type: 'direct_effect', indicator: 'rate', from: or, to: oi, reason: 'Rate ↔ Inflation swapped (Regime Change)' });
      break;
    }
    case 'freeze_opponent': {
      let bestCard: CardInstance | null = null; let bestPnL = -Infinity;
      for (const lane of LANES) for (const card of state.players[opponent].board[lane]) { if (!card.frozen) { const pnl = effectivePnL(card, state.indicators); if (pnl > bestPnL) { bestPnL = pnl; bestCard = card; } } }
      if (bestCard) { bestCard.frozen = 2; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[bestCard.defId]?.name ?? 'Position'} sanctioned! Frozen 2 turns.` }); }
      break;
    }
    case 'random_indicator_2': {
      const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
      const key = keys[Math.floor(Math.random() * keys.length)]; const delta = Math.random() < 0.5 ? 2 : -2;
      const from = state.indicators[key]; const to = clampIndicator(from + delta);
      state.indicators[key] = to; steps.push({ type: 'direct_effect', indicator: key, from, to, reason: `${key} ${delta > 0 ? '+' : ''}${delta} (Trump Tweet)` });
      break;
    }
    // ── Margin/Funding effects ────────────────────────────────
    case 'margin_tightening': {
      // Trigger immediate margin check — the risk drop from indicatorChanges will tighten threshold
      steps.push(...checkMarginCall(state));
      break;
    }
    case 'funding_freeze': {
      // Double carrying costs for all players this turn
      for (const p of state.players) {
        const extraCost = Math.ceil(totalCarryingCost(p, state.indicators));
        if (extraCost > 0) {
          p.capital = Math.max(0, p.capital - extraCost);
          steps.push({ type: 'carrying_cost', reason: `Funding freeze! Extra −${extraCost} capital (credit markets seized)` });
        }
      }
      steps.push(...checkMarginCall(state));
      break;
    }
    // ── Trap effects (target = opponent of trap owner) ────────
    case 'trap_destroy_neg_rate_sens': {
      for (const lane of LANES) {
        state.players[opponent].board[lane] = state.players[opponent].board[lane].filter(c => {
          const def = CARD_MAP[c.defId];
          if (def?.sensitivities?.rate && def.sensitivities.rate < 0) { steps.push({ type: 'direct_effect', reason: `${def.name} margin called! Liquidated.` }); return false; }
          return true;
        });
      }
      break;
    }
    case 'trap_destroy_opponent_shorts': {
      // Destroy opponent's equity lane positions (long equities get squeezed)
      state.players[opponent].board.equities = state.players[opponent].board.equities.filter(c => {
        const def = CARD_MAP[c.defId];
        steps.push({ type: 'direct_effect', reason: `${def?.name ?? 'Position'} squeezed out of equities!` });
        return false;
      });
      break;
    }
    case 'trap_destroy_top_2': {
      const allCards: { card: CardInstance; lane: Lane }[] = [];
      for (const lane of LANES) for (const card of state.players[opponent].board[lane]) allCards.push({ card, lane });
      allCards.sort((a, b) => effectivePnL(b.card, state.indicators) - effectivePnL(a.card, state.indicators));
      for (const { card, lane } of allCards.slice(0, 2)) {
        const def = CARD_MAP[card.defId];
        state.players[opponent].board[lane] = state.players[opponent].board[lane].filter(c => c.instanceId !== card.instanceId);
        steps.push({ type: 'direct_effect', reason: `${def?.name ?? 'Position'} crushed by sovereign debt crisis!` });
      }
      break;
    }
    case 'trap_opponent_minus_3': {
      for (const lane of LANES) for (const card of state.players[opponent].board[lane]) {
        if (!card.frozen) { card.currentPnL -= 3; steps.push({ type: 'direct_effect', reason: `${CARD_MAP[card.defId]?.name ?? 'Position'} panic sold! −3 P&L` }); }
      }
      break;
    }
  }

  return steps;
}

// ─── Trap Check ───────────────────────────────────────────────

type TrapEvent = 'indicator_change' | 'opponent_plays_position';

function checkTraps(
  state: GameState,
  event: TrapEvent,
  context: { actingPlayer?: 0 | 1; justPlayedId?: string } = {},
): TransmissionStep[] {
  const steps: TransmissionStep[] = [];

  for (let pi = 0; pi < 2; pi++) {
    const player = state.players[pi as 0 | 1];

    player.trapZone = player.trapZone.filter(trapCard => {
      const def = CARD_MAP[trapCard.defId];
      if (!def?.trapCondition) return true;

      const cond = def.trapCondition;
      let triggered = false;

      if (event === 'indicator_change') {
        if (cond.type === 'indicator_above') triggered = state.indicators[cond.indicator] >= cond.threshold;
        else if (cond.type === 'indicator_below') triggered = state.indicators[cond.indicator] <= cond.threshold;
      } else if (event === 'opponent_plays_position' && cond.type === 'opponent_plays_position') {
        triggered = context.actingPlayer !== undefined && context.actingPlayer !== pi;
      }

      if (!triggered) return true;

      trapCard.faceDown = false;
      steps.push({ type: 'direct_effect', reason: `⚡ TRAP: ${def.name} — ${def.description}` });

      if (def.directEffect === 'trap_debuff_entry' && context.justPlayedId) {
        const oppIdx = pi === 0 ? 1 : 0;
        for (const lane of LANES) {
          const target = state.players[oppIdx].board[lane].find(c => c.instanceId === context.justPlayedId);
          if (target) { target.currentPnL -= 3; steps.push({ type: 'direct_effect', reason: `${def.name}: ${CARD_MAP[target.defId]?.name ?? 'Position'} enters debuffed −3 (debt recalled!)` }); }
        }
      } else if (def.directEffect) {
        steps.push(...resolveDirectEffect(def.directEffect, state, pi as 0 | 1));
      }

      if (def.indicatorChanges) {
        const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
        for (const k of keys) {
          const delta = def.indicatorChanges[k];
          if (delta) {
            const result = applyIndicatorChange(state.indicators, k, delta, `${def.name} (trap): ${k} ${delta > 0 ? '+' : ''}${delta}`, state.triggeredThisQuarter);
            state.indicators = result.indicators; steps.push(...result.steps); state.triggeredThisQuarter = result.triggered;
          }
        }
        steps.push(...checkTraps(state, 'indicator_change'));
      }

      state.log.push(`⚡ Trap triggered: ${def.name}!`);
      return false;
    });
  }

  return steps;
}

// ─── Turn Effects ────────────────────────────────────────────

function resolveTurnEffects(state: GameState): TransmissionStep[] {
  const steps: TransmissionStep[] = [];
  const player = state.players[state.currentPlayer];

  for (const lane of LANES) {
    for (const card of player.board[lane]) {
      if (card.frozen) continue;
      const def = CARD_MAP[card.defId];
      if (!def?.turnEffect) continue;

      switch (def.turnEffect) {
        case 'growth_1': card.currentPnL += 1; steps.push({ type: 'position_effect', reason: `${def.name} +1` }); break;
        case 'growth_2': card.currentPnL += 2; steps.push({ type: 'position_effect', reason: `${def.name} +2` }); break;
        case 'growth_3':
          card.currentPnL += 3; steps.push({ type: 'position_effect', reason: `${def.name} +3 (war economy)` });
          if (state.indicators.inflation >= 9) { const idx = player.board[lane].indexOf(card); if (idx >= 0) { player.board[lane].splice(idx, 1); steps.push({ type: 'position_effect', reason: `${def.name} destroyed — inflation overheated!` }); } }
          break;
        case 'random_indicator': {
          const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
          const key = keys[Math.floor(Math.random() * keys.length)]; const delta = Math.random() < 0.5 ? 1 : -1;
          const from = state.indicators[key]; const to = clampIndicator(from + delta);
          state.indicators[key] = to; steps.push({ type: 'position_effect', indicator: key, from, to, reason: `${def.name}: ${key} ${delta > 0 ? '+' : ''}${delta}` });
          break;
        }
        case 'momentum':
          if (state.indicators.risk > 2) {
            card.currentPnL += 2;
            steps.push({ type: 'position_effect', reason: `${def.name} +2 (riding the trend)` });
          } else {
            card.currentPnL = 0;
            steps.push({ type: 'position_effect', reason: `${def.name} momentum crashed! P&L reset to 0 (Risk ≤ 2)` });
          }
          break;
        case 'dividend': {
          const divAmount = card.leverage ?? 1;
          player.capital += divAmount;
          steps.push({ type: 'position_effect', reason: `${def.name} pays +${divAmount} capital (dividend${divAmount > 1 ? ` ×${divAmount} leverage` : ''})` });
          break;
        }
      }
    }
  }

  return steps;
}

// ─── Quarter End ─────────────────────────────────────────────

function resolveQuarterEnd(state: GameState): TransmissionStep[] {
  const steps: TransmissionStep[] = [];

  for (const p of state.players) {
    for (const lane of LANES) {
      p.board[lane] = p.board[lane].filter(card => {
        const def = CARD_MAP[card.defId];
        if (!def?.quarterEndEffect) return true;
        if (def.quarterEndEffect === 'destroy_40' && Math.random() < 0.4) {
          steps.push({ type: 'position_effect', reason: `${def.name} collapsed! (40% bust)` });
          if (def.id === 'eq_lehman') { const from = state.indicators.risk; const to = clampIndicator(from - 2); state.indicators.risk = to; steps.push({ type: 'auto_trigger', indicator: 'risk', from, to, reason: 'Lehman collapse → Risk −2' }); }
          return false;
        }
        if (def.quarterEndEffect === 'destroy_70_risk' && Math.random() < 0.7) {
          steps.push({ type: 'position_effect', reason: `${def.name} imploded! (70% bust)` });
          const from = state.indicators.risk; const to = clampIndicator(from - 1); state.indicators.risk = to;
          steps.push({ type: 'auto_trigger', indicator: 'risk', from, to, reason: `${def.name} fraud → Risk −1` });
          return false;
        }
        return true;
      });
    }
  }

  for (const p of state.players) for (const lane of LANES) for (const card of p.board[lane]) {
    if (card.frozen && card.frozen > 0) { card.frozen -= 1; if (card.frozen === 0) card.frozen = undefined; }
  }

  return steps;
}

// ─── Game Setup ──────────────────────────────────────────────

function makeEmptyBoard(): Record<Lane, CardInstance[]> {
  return { rates: [], equities: [], commodities: [], fx: [] };
}

function drawHand(desk: Desk): CardInstance[] {
  if (desk === 'macro') {
    return shuffle(ALL_CARDS).slice(0, MAX_HAND).map(def => ({ instanceId: uid(), defId: def.id, currentPnL: def.basePnL }));
  }
  const deskCards = shuffle(getCardsForDesk(desk));
  const macroCards = shuffle(getCardsForDesk('macro').filter(c => c.type !== 'trap'));
  const orderCards = shuffle(ALL_CARDS.filter(c => c.type === 'trap'));
  // Build a pool larger than hand size for variety: all desk + 4 macro + 3 orders = ~17 cards, draw 10
  const pool = [...deskCards, ...macroCards.slice(0, 4), ...orderCards.slice(0, 3)];
  return shuffle(pool).slice(0, MAX_HAND).map(def => ({ instanceId: uid(), defId: def.id, currentPnL: def.basePnL }));
}

export function createGame(desk1: Desk, desk2: Desk, difficulty: GameState['difficulty'] = 'normal', aiLevel: GameState['aiLevel'] = 'standard'): GameState {
  return {
    players: [
      { desk: desk1, hand: drawHand(desk1), board: makeEmptyBoard(), trapZone: [], passed: false, skipsUsed: 0, quarterWins: 0, capital: 25 },
      { desk: desk2, hand: drawHand(desk2), board: makeEmptyBoard(), trapZone: [], passed: false, skipsUsed: 0, quarterWins: 0, capital: 25 },
    ],
    currentPlayer: 0,
    quarter: 1,
    indicators: { ...STARTING_INDICATORS },
    triggeredThisQuarter: [],
    laggedEffects: [],
    log: ['Quarter 1 begins. Markets are open.'],
    transmissionSteps: [],
    phase: 'playing',
    winner: null,
    turnNumber: 1,
    difficulty,
    aiLevel,
  };
}

// ─── Regime Effects ──────────────────────────────────────────

function checkRegimeEffects(def: CardDef, indicators: Indicators): RegimeEffect | null {
  if (!def.regimeEffects) return null;
  for (const re of def.regimeEffects) {
    const { indicator, op, value } = re.condition;
    const current = indicators[indicator];
    const matches = op === '>=' ? current >= value
                  : op === '<=' ? current <= value
                  : current === value;
    if (matches) return re;
  }
  return null;
}

// ─── Action Handlers ─────────────────────────────────────────

function resolvePlayCard(state: GameState, instanceId: string, lane: Lane, leverage?: 1 | 2 | 3): GameState {
  const s = structuredClone(state) as GameState;
  const pi = s.currentPlayer;
  const player = s.players[pi];
  const allSteps: TransmissionStep[] = [];

  const handIdx = player.hand.findIndex(c => c.instanceId === instanceId);
  if (handIdx === -1) return state;

  const card = player.hand[handIdx];
  const def = CARD_MAP[card.defId];
  if (!def) return state;

  // Capital cost check
  if (player.capital < def.cost) return state;
  player.capital -= def.cost;

  player.hand.splice(handIdx, 1);
  const targetLane = def.lane === 'any' ? lane : def.lane;
  let justPlayedId: string | undefined;

  if (def.type === 'position') {
    // Check board position cap
    const totalPositions = LANES.reduce((sum, l) => sum + player.board[l].length, 0);
    if (totalPositions >= MAX_BOARD_POSITIONS) return state;
    card.lane = targetLane;
    card.leverage = s.difficulty === 'easy' ? 1 : (leverage ?? 1);
    player.board[targetLane].push(card);
    justPlayedId = card.instanceId;
    const levLabel = card.leverage > 1 ? ` (${card.leverage}x leverage)` : '';
    s.log.push(`P${pi + 1} deploys ${def.name} to ${targetLane}${levLabel}`);
    allSteps.push({ type: 'chain_text', reason: `${def.name} deployed to ${targetLane} lane${levLabel}` });
  } else {
    s.log.push(`P${pi + 1} plays ${def.type}: ${def.name}`);
    allSteps.push({ type: 'chain_text', reason: def.chain ?? def.description });
  }

  // Snapshot triggers before indicator changes — only NEW triggers get position effects
  const triggersBefore = [...s.triggeredThisQuarter];

  // Check regime effects — may override indicator changes (normal+ only)
  const regime = s.difficulty !== 'easy' ? checkRegimeEffects(def, s.indicators) : null;
  const changes = regime?.indicatorOverride ?? def.indicatorChanges;

  if (regime) {
    allSteps.push({ type: 'chain_text', reason: `⚠ ${regime.label}: ${regime.description}` });
    if (regime.pnlModifier && def.type === 'position') {
      card.currentPnL += regime.pnlModifier;
    }
  }

  if (changes) {
    for (const k of (['rate', 'inflation', 'usd', 'risk'] as IndicatorKey[])) {
      const delta = changes[k];
      if (delta) {
        const result = applyIndicatorChange(s.indicators, k, delta, `${def.name}: ${k} ${delta > 0 ? '+' : ''}${delta}`, s.triggeredThisQuarter);
        s.indicators = result.indicators; allSteps.push(...result.steps); s.triggeredThisQuarter = result.triggered;
      }
    }
  }

  // Queue lagged effects for next turn (advanced only)
  if (s.difficulty === 'advanced' && def.laggedIndicatorChanges) {
    s.laggedEffects.push({
      turnsRemaining: def.lagTurns ?? 1,
      indicatorChanges: def.laggedIndicatorChanges,
      reason: def.chain ?? def.description,
      sourceCardName: def.name,
    });
    allSteps.push({ type: 'chain_text', reason: `${def.name}: lagged effect queued (resolves next turn)` });
  }

  // Only apply position effects for triggers that were NEWLY added by this action
  const newTriggers = s.triggeredThisQuarter.filter(t => !triggersBefore.includes(t));
  if (def.directEffect) allSteps.push(...resolveDirectEffect(def.directEffect, s, pi));
  allSteps.push(...applyPositionEffects(s.players, newTriggers));
  allSteps.push(...checkTraps(s, 'indicator_change'));
  if (justPlayedId) allSteps.push(...checkTraps(s, 'opponent_plays_position', { actingPlayer: pi, justPlayedId }));
  allSteps.push(...checkMarginCall(s));
  allSteps.push(...resolveTurnEffects(s));

  s.transmissionSteps = allSteps;
  return s;
}

function resolveSetCard(state: GameState, instanceId: string): GameState {
  const s = structuredClone(state) as GameState;
  const pi = s.currentPlayer;
  const player = s.players[pi];

  const handIdx = player.hand.findIndex(c => c.instanceId === instanceId);
  if (handIdx === -1) return state;

  const card = player.hand[handIdx];
  const def = CARD_MAP[card.defId];
  if (!def || (def.type !== 'trap' && def.type !== 'quickplay')) return state;
  if (player.trapZone.length >= 3) { s.log.push(`P${pi + 1}: trap zone full`); return s; }
  if (player.capital < def.cost) return state;
  player.capital -= def.cost;

  player.hand.splice(handIdx, 1);
  card.faceDown = true;
  player.trapZone.push(card);
  s.log.push(`P${pi + 1} sets a card face-down.`);
  s.transmissionSteps = [{ type: 'chain_text', reason: 'Card set face-down.' }];
  return s;
}

function resolveActivateQuickplay(state: GameState, instanceId: string): GameState {
  const s = structuredClone(state) as GameState;
  const pi = s.currentPlayer;
  const player = s.players[pi];
  const allSteps: TransmissionStep[] = [];

  let card: CardInstance | undefined;
  let fromHand = false;
  const handIdx = player.hand.findIndex(c => c.instanceId === instanceId);
  if (handIdx !== -1) { card = player.hand[handIdx]; fromHand = true; }
  else {
    const tzIdx = player.trapZone.findIndex(c => c.instanceId === instanceId);
    if (tzIdx !== -1) { card = player.trapZone[tzIdx]; }
  }
  if (!card) return state;

  const def = CARD_MAP[card.defId];
  if (!def) return state;

  // Cost only if played from hand (trap zone cards already paid)
  if (fromHand) {
    if (player.capital < def.cost) return state;
    player.capital -= def.cost;
    player.hand.splice(handIdx, 1);
  } else {
    const tzIdx = player.trapZone.findIndex(c => c.instanceId === instanceId);
    if (tzIdx !== -1) player.trapZone.splice(tzIdx, 1);
  }

  card.faceDown = false;
  s.log.push(`P${pi + 1} activates ⚡ ${def.name}`);
  allSteps.push({ type: 'chain_text', reason: `⚡ ${def.name}: ${def.chain ?? def.description}` });

  const triggersBefore = [...s.triggeredThisQuarter];

  if (def.indicatorChanges) {
    for (const k of (['rate', 'inflation', 'usd', 'risk'] as IndicatorKey[])) {
      const delta = def.indicatorChanges[k];
      if (delta) {
        const result = applyIndicatorChange(s.indicators, k, delta, `${def.name}: ${k} ${delta > 0 ? '+' : ''}${delta}`, s.triggeredThisQuarter);
        s.indicators = result.indicators; allSteps.push(...result.steps); s.triggeredThisQuarter = result.triggered;
      }
    }
  }

  const newTriggers = s.triggeredThisQuarter.filter(t => !triggersBefore.includes(t));
  if (def.directEffect) allSteps.push(...resolveDirectEffect(def.directEffect, s, pi));
  allSteps.push(...applyPositionEffects(s.players, newTriggers));
  allSteps.push(...checkTraps(s, 'indicator_change'));
  allSteps.push(...checkMarginCall(s));

  s.transmissionSteps = allSteps;
  return s;
}

// ─── Lagged Effects ─────────────────────────────────────────

function resolveLaggedEffects(state: GameState): TransmissionStep[] {
  const steps: TransmissionStep[] = [];
  const remaining: typeof state.laggedEffects = [];

  for (const effect of state.laggedEffects) {
    if (effect.turnsRemaining <= 0) {
      steps.push({ type: 'chain_text', reason: `Lagged effect: ${effect.reason} (from ${effect.sourceCardName})` });
      for (const k of (['rate', 'inflation', 'usd', 'risk'] as IndicatorKey[])) {
        const delta = effect.indicatorChanges[k];
        if (delta) {
          const result = applyIndicatorChange(state.indicators, k, delta,
            `${effect.sourceCardName} (lagged): ${k} ${delta > 0 ? '+' : ''}${delta}`,
            state.triggeredThisQuarter);
          state.indicators = result.indicators;
          steps.push(...result.steps);
          state.triggeredThisQuarter = result.triggered;
        }
      }
    } else {
      remaining.push({ ...effect, turnsRemaining: effect.turnsRemaining - 1 });
    }
  }

  state.laggedEffects = remaining;
  return steps;
}

// ─── Margin System ───────────────────────────────────────────

export function marginThreshold(indicators: Indicators): number {
  let threshold = 3.0;
  if (indicators.risk <= 3) threshold -= 0.5;  // credit crunch
  if (indicators.usd >= 7) threshold -= 0.3;   // dollar squeeze
  return Math.max(1.5, threshold); // floor at 1.5 so it's never impossible
}

export function totalExposure(player: PlayerState): number {
  let exposure = 0;
  for (const lane of LANES) {
    for (const card of player.board[lane]) {
      const def = CARD_MAP[card.defId];
      exposure += (def?.cost ?? 0) * (card.leverage ?? 1);
    }
  }
  return exposure;
}

export function marginRatio(player: PlayerState): number {
  return totalExposure(player) / Math.max(1, player.capital);
}

export function totalCarryingCost(player: PlayerState, indicators: Indicators): number {
  const rateFactor = Math.max(0.25, indicators.rate / 4);
  const fxFactor = Math.max(0, (indicators.usd - 5) / 10);       // 0 at USD=5, 0.5 at USD=10
  const creditFactor = Math.max(0, (5 - indicators.risk) / 5);    // 0 at risk≥5, 1.0 at risk=0
  let cost = 0;
  for (const lane of LANES) {
    for (const card of player.board[lane]) {
      const def = CARD_MAP[card.defId];
      const cardCost = def?.cost ?? 0;
      const lev = card.leverage ?? 1;
      const baseCost = (cardCost / 5) * lev;
      // 1. Rate funding cost (all positions)
      cost += baseCost * rateFactor;
      // 2. FX hedging cost (non-dollar positions only)
      const isNonDollar = def?.sensitivities?.usd !== undefined || def?.keywords.includes('em');
      if (isNonDollar && fxFactor > 0) {
        cost += baseCost * fxFactor;
      }
      // 3. Credit spread / counterparty premium (leveraged positions only, scales with low risk)
      if (lev > 1 && creditFactor > 0) {
        cost += (lev - 1) * creditFactor;
      }
    }
  }
  return cost;
}

function applyCarryingCosts(state: GameState, playerIdx: 0 | 1): TransmissionStep[] {
  const steps: TransmissionStep[] = [];
  const player = state.players[playerIdx];
  const cost = totalCarryingCost(player, state.indicators);
  if (cost <= 0) return steps;

  const deduct = Math.ceil(cost);
  player.capital = Math.max(0, player.capital - deduct);
  const rateFactor = Math.max(0.25, state.indicators.rate / 4);
  const fxFactor = Math.max(0, (state.indicators.usd - 5) / 10);
  const creditFactor = Math.max(0, (5 - state.indicators.risk) / 5);
  const parts = [`rate ×${rateFactor.toFixed(1)}`];
  if (fxFactor > 0) parts.push(`FX hedge ×${fxFactor.toFixed(1)}`);
  if (creditFactor > 0) parts.push(`credit spread ×${creditFactor.toFixed(1)}`);
  state.log.push(`P${playerIdx + 1} pays ${deduct} funding (${parts.join(' + ')})`);
  steps.push({
    type: 'carrying_cost',
    reason: `Funding: −${deduct} capital (${parts.join(' + ')})`,
  });
  return steps;
}

function checkMarginCall(state: GameState): TransmissionStep[] {
  const steps: TransmissionStep[] = [];
  const threshold = marginThreshold(state.indicators);
  for (const player of state.players) {
    let ratio = marginRatio(player);
    while (ratio > threshold) {
      // Find weakest position across all lanes
      let worstPnL = Infinity;
      let worstLane: Lane | null = null;
      let worstIdx = -1;

      for (const lane of LANES) {
        for (let i = 0; i < player.board[lane].length; i++) {
          const pnl = effectivePnL(player.board[lane][i], state.indicators);
          if (pnl < worstPnL) {
            worstPnL = pnl;
            worstLane = lane;
            worstIdx = i;
          }
        }
      }

      if (worstLane === null || worstIdx === -1) break; // no positions left

      const liquidated = player.board[worstLane][worstIdx];
      const def = CARD_MAP[liquidated.defId];
      const lev = liquidated.leverage ?? 1;
      const exposureFreed = (def?.cost ?? 0) * lev;
      player.board[worstLane].splice(worstIdx, 1);
      // Capital penalty capped so ratio always improves (prevents infinite loop)
      const penalty = Math.min(def?.cost ?? 0, Math.floor(exposureFreed / 2));
      player.capital = Math.max(0, player.capital - penalty);

      const msg = `MARGIN CALL: ${def?.name ?? 'Position'}${lev > 1 ? ` (${lev}x)` : ''} force-liquidated! Margin ${ratio.toFixed(1)}x > ${threshold.toFixed(1)}x. Capital −${penalty}.`;
      state.log.push(msg);
      steps.push({ type: 'liquidation', reason: msg });

      ratio = marginRatio(player);
    }
  }
  return steps;
}

// ─── Capital Income ──────────────────────────────────────────

function earnCapitalIncome(player: PlayerState, indicators: Indicators): TransmissionStep[] {
  const totalPnL = playerScore(player, indicators);
  const income = Math.max(0, Math.floor(totalPnL / 5)) + 1; // base 1 + PnL bonus
  player.capital += income;
  return [{ type: 'chain_text', reason: `+${income} capital (base 1 + ${income - 1} from P&L)` }];
}

// ─── Inspect Conditional Order ───────────────────────────────

const INSPECT_COST = 2;

function resolveInspectOrder(state: GameState, instanceId: string): GameState {
  const s = structuredClone(state) as GameState;
  const pi = s.currentPlayer;
  const opp = pi === 0 ? 1 : 0;

  if (s.players[pi].capital < INSPECT_COST) return state;

  const target = s.players[opp].trapZone.find(c => c.instanceId === instanceId);
  if (!target || !target.faceDown) return state;

  s.players[pi].capital -= INSPECT_COST;
  target.faceDown = false;
  const def = CARD_MAP[target.defId];
  s.log.push(`P${pi + 1} spends ${INSPECT_COST} capital to inspect opponent's order!`);
  s.transmissionSteps = [{ type: 'chain_text', reason: `Order revealed: ${def?.name ?? 'Unknown'}` }];
  return s;
}

// ─── Main Dispatch ────────────────────────────────────────────

export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase !== 'playing') return state;

  // ── Turn start: lagged effects → carrying costs → margin check ──
  const pre = structuredClone(state) as GameState;
  const d = pre.difficulty;
  const turnStartSteps: TransmissionStep[] = [];
  if (d === 'advanced') turnStartSteps.push(...resolveLaggedEffects(pre));
  if (d !== 'easy') turnStartSteps.push(...applyCarryingCosts(pre, pre.currentPlayer));
  if (d !== 'easy') turnStartSteps.push(...checkMarginCall(pre));

  // ── Dispatch action ──
  let s: GameState;

  if (action.type === 'play_card') s = resolvePlayCard(pre, action.instanceId, action.lane, action.leverage);
  else if (action.type === 'set_card') s = resolveSetCard(pre, action.instanceId);
  else if (action.type === 'activate_quickplay') s = resolveActivateQuickplay(pre, action.instanceId);
  else if (action.type === 'inspect_order') s = resolveInspectOrder(pre, action.instanceId);
  else if (action.type === 'skip') {
    s = structuredClone(pre) as GameState;
    s.players[s.currentPlayer].skipsUsed++;
    s.log.push(`P${s.currentPlayer + 1} skips (${2 - s.players[s.currentPlayer].skipsUsed} skips remaining).`);
    s.transmissionSteps = [];
  } else {
    s = structuredClone(pre) as GameState;
    s.players[s.currentPlayer].passed = true;
    s.log.push(`P${s.currentPlayer + 1} passes (done for the quarter).`);
    s.transmissionSteps = [];
  }

  if (s.players[0].passed && s.players[1].passed) return resolveQuarterEndPhase(s);

  // ── Post-action: margin check (deploying may push ratio over) ──
  const postMarginSteps = d !== 'easy' ? checkMarginCall(s) : [];

  // Prepend turn-start steps, append post-action margin steps
  s.transmissionSteps = [...turnStartSteps, ...s.transmissionSteps, ...postMarginSteps];

  // Earn capital income for the player who just acted
  earnCapitalIncome(s.players[s.currentPlayer], s.indicators);

  s.turnNumber++;
  const next = s.currentPlayer === 0 ? 1 : 0;
  if (!s.players[next].passed) s.currentPlayer = next as 0 | 1;

  return s;
}

// ─── Quarter Resolution ──────────────────────────────────────

function resolveQuarterEndPhase(state: GameState): GameState {
  const s = structuredClone(state) as GameState;
  const allSteps = resolveQuarterEnd(s);

  const score0 = playerScore(s.players[0], s.indicators);
  const score1 = playerScore(s.players[1], s.indicators);
  s.log.push(`Quarter ${s.quarter} ends — P1: ${score0} | P2: ${score1}`);

  if (score0 > score1) { s.players[0].quarterWins++; s.log.push('Player 1 wins the quarter!'); }
  else if (score1 > score0) { s.players[1].quarterWins++; s.log.push('Player 2 wins the quarter!'); }
  else { s.log.push('Quarter drawn.'); }

  if (s.players[0].quarterWins >= QUARTERS_TO_WIN) { s.phase = 'game_over'; s.winner = 0; s.log.push('Player 1 wins!'); s.transmissionSteps = allSteps; return s; }
  if (s.players[1].quarterWins >= QUARTERS_TO_WIN) { s.phase = 'game_over'; s.winner = 1; s.log.push('Player 2 wins!'); s.transmissionSteps = allSteps; return s; }

  if (s.quarter >= (state.maxQuarters ?? MAX_QUARTERS)) {
    s.phase = 'game_over'; s.winner = score0 >= score1 ? 0 : 1;
    s.log.push(`Match decided on P&L — Player ${s.winner + 1} wins!`); s.transmissionSteps = allSteps; return s;
  }

  s.quarter++;
  // Fresh hands, clear board — but indicators AND conditional orders persist
  for (const p of s.players) {
    p.passed = false;
    p.skipsUsed = 0;
    p.board = makeEmptyBoard();
    // trapZone persists — conditional orders carry across quarters
    p.capital = 25;
    p.hand = drawHand(p.desk);
  }
  s.triggeredThisQuarter = []; s.laggedEffects = [];
  s.log.push(`Quarter ${s.quarter} begins. New cards dealt. Capital refilled. Indicators and orders carry over.`);
  s.phase = 'playing'; s.transmissionSteps = allSteps;
  return s;
}

export { HAND_SIZE, MAX_HAND, MAX_BOARD_POSITIONS, QUARTERS_TO_WIN, shuffle, uid, makeEmptyBoard };
