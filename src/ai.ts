// ═══════════════════════════════════════════════════════════════
//  MACRO v2 — AI Opponent
//  Reads indicators, makes somewhat sensible plays.
//  Not brilliant, but not random.
// ═══════════════════════════════════════════════════════════════

import {
  GameState, CardInstance, Lane, Action, LANES, STARTING_INDICATORS,
  IndicatorKey,
} from './types';
import { CARD_MAP } from './cards';
import { effectivePnL, playerScore } from './engine';

function scoreCard(card: CardInstance, state: GameState): number {
  const def = CARD_MAP[card.defId];
  if (!def) return 0;

  const ePnL = effectivePnL(card, state.indicators);

  // Bonus: if card has indicator changes that align well
  let alignBonus = 0;
  if (def.indicatorChanges) {
    const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
    for (const k of keys) {
      const delta = def.indicatorChanges[k];
      if (!delta) continue;
      // Check if the AI's board cards benefit from this indicator change
      const aiPlayer = state.players[state.currentPlayer];
      for (const lane of LANES) {
        for (const bc of aiPlayer.board[lane]) {
          const bDef = CARD_MAP[bc.defId];
          if (bDef?.sensitivities?.[k]) {
            // If the indicator change helps our existing positions, bonus
            const helpfulness = (bDef.sensitivities[k]! * delta);
            alignBonus += helpfulness * 0.5;
          }
        }
      }
    }
  }

  // Bonus for sensitivities that align with current indicator direction from starting
  let sensBonus = 0;
  if (def.sensitivities) {
    const keys: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
    for (const k of keys) {
      const s = def.sensitivities[k];
      if (!s) continue;
      const drift = state.indicators[k] - STARTING_INDICATORS[k];
      // If indicator has drifted in a direction and sensitivity benefits from that
      if ((drift > 0 && s > 0) || (drift < 0 && s < 0)) {
        sensBonus += Math.abs(s) * 0.5;
      }
    }
  }

  // Penalty for high-risk cards (quarterEndEffect = destruction)
  let riskPenalty = 0;
  if (def.quarterEndEffect) riskPenalty = 2;

  return ePnL + alignBonus + sensBonus - riskPenalty;
}

function bestLaneForCard(card: CardInstance, state: GameState): Lane {
  const def = CARD_MAP[card.defId];
  if (def && def.lane !== 'any') return def.lane;

  // For 'any' lane cards, pick the lane where AI has fewest cards (spread out)
  const ai = state.players[state.currentPlayer];
  let bestLane: Lane = 'rates';
  let minCards = Infinity;
  for (const lane of LANES) {
    if (ai.board[lane].length < minCards) {
      minCards = ai.board[lane].length;
      bestLane = lane;
    }
  }
  return bestLane;
}

export function getAIAction(state: GameState): Action {
  const ai = state.players[state.currentPlayer];

  // No cards left: pass
  if (ai.hand.length === 0) {
    return { type: 'pass' };
  }

  // Score all playable cards
  const scored = ai.hand.map(card => ({
    card,
    score: scoreCard(card, state),
    lane: bestLaneForCard(card, state),
  }));

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];

  // Strategic passing: if we're winning and opponent hasn't passed, consider passing
  // to conserve cards for next quarter
  const myScore = playerScore(ai, state.indicators);
  const oppIdx = state.currentPlayer === 0 ? 1 : 0;
  const oppScore = playerScore(state.players[oppIdx], state.indicators);
  const leading = myScore > oppScore;
  const oppPassed = state.players[oppIdx].passed;

  // If leading by a decent margin and opponent passed, pass to lock in the win
  if (leading && oppPassed && myScore - oppScore >= 3) {
    return { type: 'pass' };
  }

  // If we have few cards left and a decent lead, consider passing
  if (leading && ai.hand.length <= 2 && myScore - oppScore >= 5) {
    return { type: 'pass' };
  }

  // If the best card has negative expected value and we're not behind, pass
  if (best.score < 0 && !oppPassed && myScore >= oppScore) {
    return { type: 'pass' };
  }

  return {
    type: 'play_card',
    instanceId: best.card.instanceId,
    lane: best.lane,
  };
}
