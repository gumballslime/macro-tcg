// ═══════════════════════════════════════════════════════════════
//  MACRO — Interactive Tutorial
//  Scripted first game with step-by-step guidance.
// ═══════════════════════════════════════════════════════════════

import { GameState, CardInstance, Lane, Action, STARTING_INDICATORS } from './types';
import { CARD_MAP } from './cards';
import { uid } from './engine';
// ─── Step Definitions ────────────────────────────────────────

export type TutorialAction = 'play_position' | 'play_catalyst' | 'wait_ai' | 'player_pass';
export type TutorialHighlight = 'indicators' | 'ai-hand' | 'hand' | 'rates' | 'equities' | 'commodities' | 'fx' | 'pass-button';

export interface TutorialStepDef {
  id: string;
  title: string;
  body: string[];
  action?: TutorialAction;   // if set, step waits for this action before advancing
  highlight?: TutorialHighlight;
}

export const TUTORIAL_STEPS: TutorialStepDef[] = [
  {
    id: 'welcome',
    title: 'Welcome to MACRO',
    body: [
      "You manage a trading desk. Your opponent manages a rival desk. Both of you play cards that move the same four macro indicators.",
      "Those indicators then mechanically change the P&L of every position on the board. The player with higher total P&L at the end of a quarter wins it. Win 2 of 3 quarters to win the match.",
      "This tutorial walks you through a real game. Let's go.",
    ],
  },
  {
    id: 'indicators',
    title: 'The Four Indicators',
    body: [
      "At the top: four macro indicators, each running 0–5.",
      "📊 Interest Rate — 0 = ZIRP, 5 = hawkish Fed. High rates hurt borrowers, reward savers.",
      "🔥 Inflation — 0 = deflation, 5 = overheating economy.",
      "💵 USD Index — 0 = weak dollar, 5 = king dollar. Crushes EM assets when high.",
      "📈 Risk Appetite — 0 = fear/crisis, 5 = greed/euphoria.",
      "Every card you or your opponent plays can move these. Your positions earn more or less P&L depending on where they land.",
    ],
    highlight: 'indicators',
  },
  {
    id: 'your_hand',
    title: 'Your Hand — Rates Desk',
    body: [
      "You're playing as the Rates Desk: specialists in interest rates, bonds, and monetary policy.",
      "Look at your cards below. Two types exist: POSITION cards (stay on the board, earn P&L continuously) and CATALYST cards (fire immediately, move indicators, then disappear).",
      "Click any card to see its full details, transmission chain, and sensitivities.",
    ],
    highlight: 'hand',
  },
  {
    id: 'play_position',
    title: 'Step 1 — Deploy a Position',
    body: [
      "The 10-Year Treasury is a classic position. Base P&L: +4. Sensitivities: Rate +2, Inflation −1, Risk −1.",
      "That means: every +1 in Interest Rate earns it +2 extra P&L. Inflation or Risk rising hurts it.",
      "Do this: click the 10-Year Treasury → 'Select to Play' → click the Rates lane on the board.",
    ],
    action: 'play_position',
    highlight: 'hand',
  },
  {
    id: 'after_position',
    title: 'Position on the Board',
    body: [
      "Your 10-Year Treasury is deployed. It's earning +4 P&L at neutral indicators.",
      "As you play more cards and move indicators, this card's P&L will change in real time — you can see it update on the compact board card.",
    ],
    highlight: 'rates',
  },
  {
    id: 'play_catalyst',
    title: 'Step 2 — Fire a Catalyst',
    body: [
      "QE Infinity is a catalyst. It doesn't stay on the board — it fires immediately and is discarded.",
      "QE Infinity moves Rate −1 and Risk Appetite +2. Watch what that does to your 10-Year Treasury's P&L.",
      "Do this: click QE Infinity → 'Select to Play' → click any lane.",
    ],
    action: 'play_catalyst',
    highlight: 'hand',
  },
  {
    id: 'transmission',
    title: 'The Transmission Chain',
    body: [
      "That panel at the bottom is the Transmission Chain — it shows every effect that fired in sequence.",
      "QE Infinity → Rate fell → Risk rose → your 10-Year Treasury's effective P&L changed.",
      "This is the educational core of MACRO. Every card tells a real macro story. Click the chain or wait for it to clear.",
    ],
  },
  {
    id: 'ai_buffett',
    title: "Opponent's Turn — Watch Closely",
    body: [
      "The AI (Equities Desk) is about to play. Its cards LOVE high Risk Appetite — the opposite of what bond positions want.",
      "Watch what it deploys and how the chain affects your positions too.",
    ],
    action: 'wait_ai',
    highlight: 'ai-hand',
  },
  {
    id: 'after_buffett',
    title: 'Warren Buffett — Value That Compounds',
    body: [
      "The AI played Warren Buffett: a position worth +5 P&L that grows +1 every single turn automatically. Immune to catalyst effects.",
      "Both sides are affected by the same indicators. You need indicators that boost your sensitivities and hurt the AI's.",
      "The Rates desk and Equities desk are often in direct conflict: rates rising helps you, hurts them.",
    ],
  },
  {
    id: 'play_yci',
    title: 'Step 3 — Signal Recession Risk',
    body: [
      "Yield Curve Inversion is a catalyst that drops Risk Appetite by 2 — a classic recession signal.",
      "This will hurt Equities positions (Risk sensitive) and set up a dramatic chain reaction next turn.",
      "Do this: click Yield Curve Inversion → 'Select to Play' → any lane.",
    ],
    action: 'play_catalyst',
    highlight: 'hand',
  },
  {
    id: 'ai_blackmonday',
    title: 'Black Monday — The AI Retaliates',
    body: [
      "The AI plays Black Monday: a catalyst that crashes Risk Appetite by 3.",
      "Watch the chain carefully. When Risk hits 0, an AUTO-TRIGGER fires: Flight to Safety. Rates positions +2, Equities positions −2.",
      "Your 10-Year Treasury is about to profit from a market crash.",
    ],
    action: 'wait_ai',
    highlight: 'ai-hand',
  },
  {
    id: 'after_blackmonday',
    title: 'Auto-Trigger: Flight to Safety',
    body: [
      "Risk Appetite crashed to 0. The system automatically fired a Flight to Safety: your Rates positions gained +2 P&L, the AI's Equities positions lost −2.",
      "No card triggered that — the indicator hit an extreme threshold and the macro mechanism fired on its own.",
      "This is how cascades work in real markets. You're positioned correctly when they happen.",
    ],
  },
  {
    id: 'pass',
    title: 'Step 4 — Lock In the Quarter',
    body: [
      "Check the scores at the top. You should be ahead. Pass to end your actions.",
      "The quarter ends when both players pass. Higher total board P&L wins the quarter.",
      "Do this: click the Pass button.",
    ],
    action: 'player_pass',
    highlight: 'pass-button',
  },
  {
    id: 'complete',
    title: "You're Ready",
    body: [
      "You played positions, fired catalysts, watched the transmission chain, survived Black Monday, and profited from the cascade.",
      "That's how MACRO works. Now pick your desk and play for real. Each desk has a different macro strategy — try them all.",
    ],
  },
];

// ─── Tutorial Game ────────────────────────────────────────────

function makeEmptyBoard(): Record<Lane, CardInstance[]> {
  return { rates: [], equities: [], commodities: [], fx: [] };
}

export function createTutorialGame(): GameState {
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
    'eq_earnings',
    'eq_techbubble',
    'eq_activist',
    'eq_ipo',
  ];

  const makeHand = (ids: string[]): CardInstance[] =>
    ids.map(defId => ({
      instanceId: uid(),
      defId,
      currentPnL: CARD_MAP[defId]?.basePnL ?? 0,
    }));

  return {
    players: [
      {
        desk: 'rates',
        hand: makeHand(playerCardIds),
        board: makeEmptyBoard(),
        passed: false,
        quarterWins: 0,
      },
      {
        desk: 'equities',
        hand: makeHand(aiCardIds),
        board: makeEmptyBoard(),
        passed: false,
        quarterWins: 0,
      },
    ],
    currentPlayer: 0,
    quarter: 1,
    indicators: { ...STARTING_INDICATORS },
    triggeredThisQuarter: [],
    log: ['Tutorial — Quarter 1. You play as the Rates Desk.'],
    transmissionSteps: [],
    phase: 'playing',
    winner: null,
    turnNumber: 1,
  };
}

// ─── Scripted AI ──────────────────────────────────────────────
// Turn 0 → Warren Buffett; Turn 1 → Black Monday

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

