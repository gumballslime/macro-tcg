// ═══════════════════════════════════════════════════════════════
//  MACRO v2 — Game Engine
//  Indicators drive everything. Cards move indicators.
//  Indicators mechanically affect positions. That's the game.
// ═══════════════════════════════════════════════════════════════

import {
  GameState, PlayerState, CardInstance, CardDef, Indicators,
  IndicatorKey, Lane, Desk, Action, TransmissionStep,
  STARTING_INDICATORS, LANES,
} from './types';
import { ALL_CARDS, CARD_MAP, getCardsForDesk } from './cards';

// ─── Constants ───────────────────────────────────────────────

const HAND_SIZE = 10;
const QUARTERS_TO_WIN = 2;
const MAX_QUARTERS = 3;
const INDICATOR_MIN = 0;
const INDICATOR_MAX = 5;

// ─── Helpers ─────────────────────────────────────────────────

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

// ─── Effective P&L Calculation ───────────────────────────────
// effectivePnL = basePnL + Σ(sensitivity × (currentIndicator - startingIndicator))
// At game start, the sensitivity contribution is 0.

export function effectivePnL(card: CardInstance, indicators: Indicators): number {
  const def = CARD_MAP[card.defId];
  if (!def) return card.currentPnL;

  const sens = def.sensitivities;
  if (!sens) return card.currentPnL;

  let bonus = 0;
  const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
  for (const k of keys) {
    const s = sens[k];
    if (s) {
      bonus += s * (indicators[k] - STARTING_INDICATORS[k]);
    }
  }

  return card.currentPnL + bonus;
}

// ─── Board Score ─────────────────────────────────────────────

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

  // Check auto-triggers after this change
  const result = checkAutoTriggers(newIndicators, steps, triggered);
  return result;
}

function checkAutoTriggers(
  indicators: Indicators,
  steps: TransmissionStep[],
  triggered: string[],
): IndicatorChangeResult {
  let ind = { ...indicators };
  const allSteps = [...steps];
  const allTriggered = [...triggered];

  // Inflation ≥ 4 → Rate +1
  if (ind.inflation >= 4 && !allTriggered.includes('inflation_rate_hike')) {
    allTriggered.push('inflation_rate_hike');
    const from = ind.rate;
    const to = clampIndicator(from + 1);
    if (from !== to) {
      ind = { ...ind, rate: to };
      allSteps.push({
        type: 'auto_trigger',
        indicator: 'rate',
        from, to,
        reason: 'Inflation ≥ 4 → Central bank forced to hike rates',
      });
      // Recursive: rate change might trigger more
      const sub = checkAutoTriggers(ind, [], allTriggered);
      ind = sub.indicators;
      allSteps.push(...sub.steps);
      allTriggered.push(...sub.triggered.filter(t => !allTriggered.includes(t)));
    }
  }

  // Rate ≥ 4 → Risk −1
  if (ind.rate >= 4 && !allTriggered.includes('rate_risk_down')) {
    allTriggered.push('rate_risk_down');
    const from = ind.risk;
    const to = clampIndicator(from - 1);
    if (from !== to) {
      ind = { ...ind, risk: to };
      allSteps.push({
        type: 'auto_trigger',
        indicator: 'risk',
        from, to,
        reason: 'Interest Rate ≥ 4 → Tight money kills animal spirits',
      });
      const sub = checkAutoTriggers(ind, [], allTriggered);
      ind = sub.indicators;
      allSteps.push(...sub.steps);
      allTriggered.push(...sub.triggered.filter(t => !allTriggered.includes(t)));
    }
  }

  // Rate = 0 → Risk +1
  if (ind.rate === 0 && !allTriggered.includes('zirp_risk_up')) {
    allTriggered.push('zirp_risk_up');
    const from = ind.risk;
    const to = clampIndicator(from + 1);
    if (from !== to) {
      ind = { ...ind, risk: to };
      allSteps.push({
        type: 'auto_trigger',
        indicator: 'risk',
        from, to,
        reason: 'Interest Rate at 0 → ZIRP pushes investors into risky assets',
      });
      const sub = checkAutoTriggers(ind, [], allTriggered);
      ind = sub.indicators;
      allSteps.push(...sub.steps);
      allTriggered.push(...sub.triggered.filter(t => !allTriggered.includes(t)));
    }
  }

  // USD ≥ 4 → All EM-tagged positions −2 (handled as a step, actual effect applied in resolvePlay)
  if (ind.usd >= 4 && !allTriggered.includes('usd_em_crush')) {
    allTriggered.push('usd_em_crush');
    allSteps.push({
      type: 'position_effect',
      reason: 'USD ≥ 4 → Strong dollar crushes emerging market positions (−2 P&L)',
    });
  }

  // Risk = 0 → Flight to safety: Rates +2, Equities −2
  if (ind.risk === 0 && !allTriggered.includes('flight_to_safety')) {
    allTriggered.push('flight_to_safety');
    allSteps.push({
      type: 'position_effect',
      reason: 'Risk Appetite at 0 → Flight to safety: Rates positions +2, Equities positions −2',
    });
  }

  // Risk = 5 → Euphoria: Equities +2, Rates −1
  if (ind.risk === 5 && !allTriggered.includes('euphoria')) {
    allTriggered.push('euphoria');
    allSteps.push({
      type: 'position_effect',
      reason: 'Risk Appetite at 5 → Euphoria: Equities positions +2, Rates positions −1',
    });
  }

  return { indicators: ind, steps: allSteps, triggered: allTriggered };
}

// ─── Apply Position Effects from Auto-Triggers ───────────────

function applyPositionEffects(
  players: [PlayerState, PlayerState],
  triggered: string[],
): TransmissionStep[] {
  const steps: TransmissionStep[] = [];

  if (triggered.includes('usd_em_crush')) {
    for (const p of players) {
      for (const lane of LANES) {
        for (const card of p.board[lane]) {
          const def = CARD_MAP[card.defId];
          if (def?.keywords.includes('em') && !card.frozen) {
            card.currentPnL -= 2;
            steps.push({
              type: 'position_effect',
              reason: `${def.name} (EM) −2 from strong dollar`,
            });
          }
        }
      }
    }
  }

  if (triggered.includes('flight_to_safety')) {
    for (const p of players) {
      for (const card of p.board.rates) {
        if (!card.frozen) {
          card.currentPnL += 2;
          const def = CARD_MAP[card.defId];
          steps.push({ type: 'position_effect', reason: `${def?.name ?? 'Position'} +2 (flight to safety)` });
        }
      }
      for (const card of p.board.equities) {
        if (!card.frozen) {
          card.currentPnL -= 2;
          const def = CARD_MAP[card.defId];
          steps.push({ type: 'position_effect', reason: `${def?.name ?? 'Position'} −2 (flight to safety)` });
        }
      }
    }
  }

  if (triggered.includes('euphoria')) {
    for (const p of players) {
      for (const card of p.board.equities) {
        if (!card.frozen) {
          card.currentPnL += 2;
          const def = CARD_MAP[card.defId];
          steps.push({ type: 'position_effect', reason: `${def?.name ?? 'Position'} +2 (euphoria)` });
        }
      }
      for (const card of p.board.rates) {
        if (!card.frozen) {
          card.currentPnL -= 1;
          const def = CARD_MAP[card.defId];
          steps.push({ type: 'position_effect', reason: `${def?.name ?? 'Position'} −1 (euphoria)` });
        }
      }
    }
  }

  return steps;
}

// ─── Direct Effects ──────────────────────────────────────────

function resolveDirectEffect(
  effect: string,
  state: GameState,
  playerIdx: 0 | 1,
): TransmissionStep[] {
  const steps: TransmissionStep[] = [];
  const opponent = playerIdx === 0 ? 1 : 0;

  switch (effect) {
    case 'destroy_shorts': {
      // Destroy all Short-tagged cards on both sides
      for (const p of state.players) {
        for (const lane of LANES) {
          const before = p.board[lane].length;
          p.board[lane] = p.board[lane].filter(c => {
            const def = CARD_MAP[c.defId];
            if (def?.keywords.includes('short')) {
              steps.push({ type: 'direct_effect', reason: `${def.name} squeezed and destroyed!` });
              return false;
            }
            return true;
          });
        }
      }
      break;
    }

    case 'equities_boost_2':
    case 'equities_boost_1': {
      const amount = effect === 'equities_boost_2' ? 2 : 1;
      const player = state.players[playerIdx];
      for (const card of player.board.equities) {
        if (!card.frozen) {
          card.currentPnL += amount;
          const def = CARD_MAP[card.defId];
          steps.push({ type: 'direct_effect', reason: `${def?.name ?? 'Position'} +${amount} (equities boost)` });
        }
      }
      break;
    }

    case 'commodities_boost_2': {
      const player = state.players[playerIdx];
      for (const card of player.board.commodities) {
        if (!card.frozen) {
          card.currentPnL += 2;
          const def = CARD_MAP[card.defId];
          steps.push({ type: 'direct_effect', reason: `${def?.name ?? 'Position'} +2 (commodities boost)` });
        }
      }
      break;
    }

    case 'boost_equities_3': {
      // Boost the highest-P&L friendly equities card by 3
      const player = state.players[playerIdx];
      const eqCards = player.board.equities.filter(c => !c.frozen && c.instanceId !== '');
      if (eqCards.length > 0) {
        const best = eqCards.reduce((a, b) =>
          effectivePnL(a, state.indicators) >= effectivePnL(b, state.indicators) ? a : b
        );
        best.currentPnL += 3;
        const def = CARD_MAP[best.defId];
        steps.push({ type: 'direct_effect', reason: `${def?.name ?? 'Position'} +3 (activist investor)` });
      }
      break;
    }

    case 'fx_chaos': {
      // Highest FX position on each side ±4 randomly
      for (let pi = 0; pi < 2; pi++) {
        const fxCards = state.players[pi as 0 | 1].board.fx.filter(c => !c.frozen);
        if (fxCards.length > 0) {
          const best = fxCards.reduce((a, b) =>
            effectivePnL(a, state.indicators) >= effectivePnL(b, state.indicators) ? a : b
          );
          const delta = Math.random() < 0.5 ? 4 : -4;
          best.currentPnL += delta;
          const def = CARD_MAP[best.defId];
          steps.push({
            type: 'direct_effect',
            reason: `${def?.name ?? 'FX Position'} ${delta > 0 ? '+' : ''}${delta} (Swiss Franc chaos)`,
          });
        }
      }
      break;
    }

    case 'stable_minus_2': {
      // All 'stable' keyword positions −2
      for (const p of state.players) {
        for (const lane of LANES) {
          for (const card of p.board[lane]) {
            const def = CARD_MAP[card.defId];
            if (def?.keywords.includes('stable') && !card.frozen) {
              card.currentPnL -= 2;
              steps.push({ type: 'direct_effect', reason: `${def.name} −2 (stability shattered)` });
            }
          }
        }
      }
      break;
    }

    case 'reset_indicators': {
      // Move all indicators toward neutral (2-3)
      const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
      for (const k of keys) {
        const current = state.indicators[k];
        const neutral = k === 'usd' || k === 'risk' ? 3 : 2;
        if (current !== neutral) {
          const from = current;
          state.indicators[k] = neutral;
          steps.push({
            type: 'direct_effect',
            indicator: k,
            from,
            to: neutral,
            reason: `${k} reset to ${neutral} (Bretton Woods)`,
          });
        }
      }
      break;
    }

    case 'swap_rate_inflation': {
      const oldRate = state.indicators.rate;
      const oldInflation = state.indicators.inflation;
      state.indicators.rate = oldInflation;
      state.indicators.inflation = oldRate;
      steps.push({
        type: 'direct_effect',
        indicator: 'rate',
        from: oldRate,
        to: oldInflation,
        reason: `Interest Rate and Inflation swapped (Regime Change)`,
      });
      break;
    }

    case 'freeze_opponent': {
      // Freeze the highest-value opponent position for 2 turns
      let bestCard: CardInstance | null = null;
      let bestPnL = -Infinity;
      for (const lane of LANES) {
        for (const card of state.players[opponent].board[lane]) {
          if (!card.frozen) {
            const pnl = effectivePnL(card, state.indicators);
            if (pnl > bestPnL) {
              bestPnL = pnl;
              bestCard = card;
            }
          }
        }
      }
      if (bestCard) {
        bestCard.frozen = 2;
        const def = CARD_MAP[bestCard.defId];
        steps.push({ type: 'direct_effect', reason: `${def?.name ?? 'Position'} sanctioned! Frozen for 2 turns.` });
      }
      break;
    }

    case 'random_indicator_2': {
      const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
      const key = keys[Math.floor(Math.random() * keys.length)];
      const delta = Math.random() < 0.5 ? 2 : -2;
      const from = state.indicators[key];
      const to = clampIndicator(from + delta);
      state.indicators[key] = to;
      steps.push({
        type: 'direct_effect',
        indicator: key,
        from,
        to,
        reason: `${key} ${delta > 0 ? '+' : ''}${delta} (Trump Tweet)`,
      });
      break;
    }
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
        case 'growth_1':
          card.currentPnL += 1;
          steps.push({ type: 'position_effect', reason: `${def.name} +1 (steady growth)` });
          break;
        case 'growth_2':
          card.currentPnL += 2;
          steps.push({ type: 'position_effect', reason: `${def.name} +2 (momentum)` });
          break;
        case 'growth_3':
          card.currentPnL += 3;
          steps.push({ type: 'position_effect', reason: `${def.name} +3 (war economy boost)` });
          // War Economy: destroyed if inflation hits 5
          if (state.indicators.inflation >= 5) {
            const idx = player.board[lane].indexOf(card);
            if (idx >= 0) {
              player.board[lane].splice(idx, 1);
              steps.push({ type: 'position_effect', reason: `${def.name} destroyed — inflation overheated!` });
            }
          }
          break;
        case 'random_indicator': {
          const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
          const key = keys[Math.floor(Math.random() * keys.length)];
          const delta = Math.random() < 0.5 ? 1 : -1;
          const from = state.indicators[key];
          const to = clampIndicator(from + delta);
          state.indicators[key] = to;
          steps.push({
            type: 'position_effect',
            indicator: key,
            from,
            to,
            reason: `${def.name}: ${key} ${delta > 0 ? '+' : ''}${delta} (chaos)`,
          });
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

        switch (def.quarterEndEffect) {
          case 'destroy_40': {
            if (Math.random() < 0.4) {
              steps.push({ type: 'position_effect', reason: `${def.name} collapsed! (40% bust)` });
              // Lehman special: if destroyed, Risk −1
              if (def.id === 'eq_lehman') {
                const from = state.indicators.risk;
                const to = clampIndicator(from - 2);
                state.indicators.risk = to;
                steps.push({
                  type: 'auto_trigger',
                  indicator: 'risk',
                  from,
                  to,
                  reason: 'Lehman collapse → systemic contagion → Risk Appetite −2',
                });
              }
              return false;
            }
            return true;
          }
          case 'destroy_70_risk': {
            if (Math.random() < 0.7) {
              steps.push({ type: 'position_effect', reason: `${def.name} imploded! (70% bust)` });
              const from = state.indicators.risk;
              const to = clampIndicator(from - 1);
              state.indicators.risk = to;
              steps.push({
                type: 'auto_trigger',
                indicator: 'risk',
                from,
                to,
                reason: `${def.name} fraud revealed → Risk Appetite −1`,
              });
              return false;
            }
            return true;
          }
        }
        return true;
      });
    }
  }

  // Decrement frozen counters
  for (const p of state.players) {
    for (const lane of LANES) {
      for (const card of p.board[lane]) {
        if (card.frozen && card.frozen > 0) {
          card.frozen -= 1;
          if (card.frozen === 0) card.frozen = undefined;
        }
      }
    }
  }

  return steps;
}

// ─── Game Setup ──────────────────────────────────────────────

function makeEmptyBoard(): Record<Lane, CardInstance[]> {
  return { rates: [], equities: [], commodities: [], fx: [] };
}

function drawHand(desk: Desk): CardInstance[] {
  const pool = desk === 'macro'
    ? shuffle(ALL_CARDS) // Macro desk draws from all
    : [...getCardsForDesk(desk), ...getCardsForDesk('macro').slice(0, 3)]; // Home + 3 macro

  const shuffled = shuffle(pool);
  return shuffled.slice(0, HAND_SIZE).map(def => ({
    instanceId: uid(),
    defId: def.id,
    currentPnL: def.basePnL,
  }));
}

export function createGame(desk1: Desk, desk2: Desk): GameState {
  return {
    players: [
      {
        desk: desk1,
        hand: drawHand(desk1),
        board: makeEmptyBoard(),
        passed: false,
        quarterWins: 0,
      },
      {
        desk: desk2,
        hand: drawHand(desk2),
        board: makeEmptyBoard(),
        passed: false,
        quarterWins: 0,
      },
    ],
    currentPlayer: 0,
    quarter: 1,
    indicators: { ...STARTING_INDICATORS },
    triggeredThisQuarter: [],
    log: ['Quarter 1 begins. Markets are open.'],
    transmissionSteps: [],
    phase: 'playing',
    winner: null,
    turnNumber: 1,
  };
}

// ─── Play a Card ─────────────────────────────────────────────

function resolvePlayCard(state: GameState, instanceId: string, lane: Lane): GameState {
  const s = structuredClone(state) as GameState;
  const pi = s.currentPlayer;
  const player = s.players[pi];
  const allSteps: TransmissionStep[] = [];

  // Find card in hand
  const handIdx = player.hand.findIndex(c => c.instanceId === instanceId);
  if (handIdx === -1) return state;

  const card = player.hand[handIdx];
  const def = CARD_MAP[card.defId];
  if (!def) return state;

  // Remove from hand
  player.hand.splice(handIdx, 1);

  // Determine target lane
  const targetLane = def.lane === 'any' ? lane : def.lane;

  if (def.type === 'position') {
    // Deploy to board
    card.lane = targetLane;
    player.board[targetLane].push(card);
    s.log.push(`P${pi + 1} deploys ${def.name} to ${targetLane}`);
    allSteps.push({ type: 'chain_text', reason: `${def.name} deployed to ${targetLane} lane` });
  } else {
    // Catalyst — not deployed, just effects
    s.log.push(`P${pi + 1} plays catalyst: ${def.name}`);
    allSteps.push({ type: 'chain_text', reason: def.chain ?? def.description });
  }

  // Apply indicator changes
  if (def.indicatorChanges) {
    const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
    for (const k of keys) {
      const delta = def.indicatorChanges[k];
      if (delta) {
        const result = applyIndicatorChange(
          s.indicators, k, delta,
          `${def.name}: ${k} ${delta > 0 ? '+' : ''}${delta}`,
          s.triggeredThisQuarter,
        );
        s.indicators = result.indicators;
        allSteps.push(...result.steps);
        s.triggeredThisQuarter = result.triggered;
      }
    }
  }

  // Apply direct effects
  if (def.directEffect) {
    const effectSteps = resolveDirectEffect(def.directEffect, s, pi);
    allSteps.push(...effectSteps);
  }

  // Apply position effects from any auto-triggers that fired
  const posSteps = applyPositionEffects(s.players, s.triggeredThisQuarter);
  allSteps.push(...posSteps);

  // Resolve turn effects for current player's board
  const turnSteps = resolveTurnEffects(s);
  allSteps.push(...turnSteps);

  s.transmissionSteps = allSteps;
  return s;
}

// ─── Main Action Dispatch ────────────────────────────────────

export function applyAction(state: GameState, action: Action): GameState {
  if (state.phase !== 'playing') return state;

  let s: GameState;

  if (action.type === 'play_card') {
    s = resolvePlayCard(state, action.instanceId, action.lane);
  } else {
    // Pass
    s = structuredClone(state) as GameState;
    s.players[s.currentPlayer].passed = true;
    s.log.push(`P${s.currentPlayer + 1} passes.`);
    s.transmissionSteps = [];
  }

  // Check if both passed → quarter end
  if (s.players[0].passed && s.players[1].passed) {
    return resolveQuarterEndPhase(s);
  }

  // Advance turn
  s.turnNumber++;
  const next = s.currentPlayer === 0 ? 1 : 0;
  // Skip passed players
  if (s.players[next].passed) {
    // Other player already passed, current player continues
  } else {
    s.currentPlayer = next as 0 | 1;
  }

  return s;
}

// ─── Quarter Resolution ──────────────────────────────────────

function resolveQuarterEndPhase(state: GameState): GameState {
  const s = structuredClone(state) as GameState;
  const allSteps: TransmissionStep[] = [];

  // Quarter-end effects (destruction, etc.)
  const qeSteps = resolveQuarterEnd(s);
  allSteps.push(...qeSteps);

  // Score
  const score0 = playerScore(s.players[0], s.indicators);
  const score1 = playerScore(s.players[1], s.indicators);

  s.log.push(`Quarter ${s.quarter} ends — P1: ${score0} | P2: ${score1}`);

  if (score0 > score1) {
    s.players[0].quarterWins++;
    s.log.push(`Player 1 wins the quarter!`);
  } else if (score1 > score0) {
    s.players[1].quarterWins++;
    s.log.push(`Player 2 wins the quarter!`);
  } else {
    s.log.push(`Quarter drawn — no winner.`);
  }

  // Check for game winner
  if (s.players[0].quarterWins >= QUARTERS_TO_WIN) {
    s.phase = 'game_over';
    s.winner = 0;
    s.log.push('Player 1 wins the match!');
    s.transmissionSteps = allSteps;
    return s;
  }
  if (s.players[1].quarterWins >= QUARTERS_TO_WIN) {
    s.phase = 'game_over';
    s.winner = 1;
    s.log.push('Player 2 wins the match!');
    s.transmissionSteps = allSteps;
    return s;
  }

  if (s.quarter >= MAX_QUARTERS) {
    // Tiebreak: total P&L across all quarters (simplified: current scores)
    s.phase = 'game_over';
    s.winner = score0 >= score1 ? 0 : 1;
    s.log.push(`Match decided on total P&L — Player ${s.winner + 1} wins!`);
    s.transmissionSteps = allSteps;
    return s;
  }

  // Start new quarter
  s.quarter++;
  s.players[0].passed = false;
  s.players[1].passed = false;
  s.triggeredThisQuarter = [];

  // Clear boards for new quarter (Gwent-style)
  s.players[0].board = makeEmptyBoard();
  s.players[1].board = makeEmptyBoard();

  // Indicators persist across quarters (this is key — your macro environment carries over)
  s.log.push(`Quarter ${s.quarter} begins.`);
  s.phase = 'playing';
  s.transmissionSteps = allSteps;

  return s;
}

// ─── Utility Exports ─────────────────────────────────────────

export { HAND_SIZE, QUARTERS_TO_WIN, shuffle, uid };
