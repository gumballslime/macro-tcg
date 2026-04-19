// ═══════════════════════════════════════════════════════════════
//  MACRO — AI Opponent
//  Reads indicators, plays cards, and sets conditional orders.
// ═══════════════════════════════════════════════════════════════

import {
  GameState, CardInstance, Lane, Action, LANES, STARTING_INDICATORS,
  IndicatorKey,
} from './types';
import { CARD_MAP } from './cards';
import { effectivePnL, playerScore, marginRatio } from './engine';

function scoreCard(card: CardInstance, state: GameState): number {
  const def = CARD_MAP[card.defId];
  if (!def) return 0;

  const pi = state.currentPlayer;
  const opp = pi === 0 ? 1 : 0;
  const ePnL = effectivePnL(card, state.indicators);

  // How does this card's indicator changes affect MY board? (strong weight)
  let myBoardImpact = 0;
  // How does it affect OPPONENT's board? (want to hurt them)
  let oppBoardImpact = 0;

  if (def.indicatorChanges) {
    const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
    for (const k of keys) {
      const delta = def.indicatorChanges[k];
      if (!delta) continue;
      // Impact on my positions
      for (const lane of LANES) {
        for (const bc of state.players[pi].board[lane]) {
          const bDef = CARD_MAP[bc.defId];
          const sens = bDef?.sensitivities?.[k];
          if (sens) myBoardImpact += sens * delta * (bc.leverage ?? 1);
        }
        // Impact on opponent's positions (we WANT negative impact)
        for (const bc of state.players[opp].board[lane]) {
          const bDef = CARD_MAP[bc.defId];
          const sens = bDef?.sensitivities?.[k];
          if (sens) oppBoardImpact += sens * delta * (bc.leverage ?? 1);
        }
      }
    }
  }

  // How well does this card fit the current environment? (for positions)
  let envFit = 0;
  if (def.sensitivities) {
    const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
    for (const k of keys) {
      const s = def.sensitivities[k];
      if (!s) continue;
      const drift = state.indicators[k] - STARTING_INDICATORS[k];
      // Reward cards whose sensitivities align with current indicator direction
      envFit += s * drift * 0.3;
    }
  }

  let riskPenalty = 0;
  if (def.quarterEndEffect) riskPenalty = 3;

  // Score: position P&L + help my board + hurt their board + environment fit - risk
  // myBoardImpact: positive = helps me, negative = hurts me (DON'T play it)
  // oppBoardImpact: negative = hurts them (GOOD), positive = helps them (BAD)
  return ePnL + myBoardImpact - oppBoardImpact + envFit - riskPenalty;
}

function bestLaneForCard(card: CardInstance, state: GameState): Lane {
  const def = CARD_MAP[card.defId];
  if (def && def.lane !== 'any') return def.lane;
  const ai = state.players[state.currentPlayer];
  let bestLane: Lane = 'rates';
  let minCards = Infinity;
  for (const lane of LANES) {
    if (ai.board[lane].length < minCards) { minCards = ai.board[lane].length; bestLane = lane; }
  }
  return bestLane;
}

export function getAIAction(state: GameState): Action {
  const ai = state.players[state.currentPlayer];
  const level = state.aiLevel ?? 'standard';

  if (ai.hand.length === 0 && ai.trapZone.length === 0) return { type: 'pass' };
  if (ai.hand.length === 0) return { type: 'pass' };

  // Filter to affordable cards
  const affordable = ai.hand.filter(c => {
    const d = CARD_MAP[c.defId];
    return d && d.cost <= ai.capital;
  });
  if (affordable.length === 0) return { type: 'pass' };

  // Passive AI: 50% chance of random play, passes early when ahead
  if (level === 'passive' && Math.random() < 0.5) {
    const pick = affordable[Math.floor(Math.random() * affordable.length)];
    const def = CARD_MAP[pick.defId];
    const lane = def?.lane === 'any'
      ? (['rates', 'equities', 'commodities', 'fx'] as const)[Math.floor(Math.random() * 4)]
      : (def?.lane ?? 'rates');
    return { type: 'play_card', instanceId: pick.instanceId, lane };
  }

  // Score playable cards
  const scored = affordable.map(card => ({
    card,
    score: scoreCard(card, state),
    lane: bestLaneForCard(card, state),
    def: CARD_MAP[card.defId],
  }));
  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // Strategic passing
  const myScore = playerScore(ai, state.indicators);
  const oppIdx = state.currentPlayer === 0 ? 1 : 0;
  const oppScore = playerScore(state.players[oppIdx], state.indicators);
  const leading = myScore > oppScore;
  const oppPassed = state.players[oppIdx].passed;

  // AI can skip to preserve capital (if skips remaining and carrying costs are high)
  if (ai.skipsUsed < 2 && ai.capital < 3 && best.score < 3) {
    return { type: 'skip' };
  }

  // Passive passes earlier, aggressive rarely passes
  if (level === 'passive' && leading && myScore - oppScore >= 2) return { type: 'pass' };
  if (level !== 'aggressive') {
    if (leading && oppPassed && myScore - oppScore >= 3) return { type: 'pass' };
    if (leading && ai.hand.length <= 2 && myScore - oppScore >= 5) return { type: 'pass' };
  }
  if (best.score < 0 && !oppPassed && myScore >= oppScore) return { type: 'pass' };

  // 40% chance to set a trap/quickplay face-down instead of playing it
  if (best.def?.type === 'trap' || best.def?.type === 'quickplay') {
    if (Math.random() < 0.4) {
      return { type: 'set_card', instanceId: best.card.instanceId };
    }
  }

  // Choose leverage for position cards
  const leverage = best.def?.type === 'position' ? chooseLeverage(best.card, state) : undefined;
  return { type: 'play_card', instanceId: best.card.instanceId, lane: best.lane, leverage };
}

function chooseLeverage(card: CardInstance, state: GameState): 1 | 2 | 3 {
  const def = CARD_MAP[card.defId];
  if (!def) return 1;
  const ai = state.players[state.currentPlayer];
  const currentRatio = marginRatio(ai);

  // Don't lever if already stretched or rates are expensive
  if (currentRatio > 2.0) return 1;
  if (state.indicators.rate >= 7) return 1;

  let confidence = 0;
  const ePnL = effectivePnL(card, state.indicators);
  if (ePnL > 5) confidence++;
  if (ePnL > 10) confidence++;
  if (def.sensitivities) {
    for (const k of ['rate', 'inflation', 'usd', 'risk'] as IndicatorKey[]) {
      const s = def.sensitivities[k];
      if (!s) continue;
      const drift = state.indicators[k] - STARTING_INDICATORS[k];
      if ((drift > 0 && s > 0) || (drift < 0 && s < 0)) confidence++;
    }
  }

  if (confidence >= 3 && currentRatio < 1.5) return 3;
  if (confidence >= 2 && currentRatio < 2.0) return 2;
  return 1;
}
