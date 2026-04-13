import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Desk, Action, DESK_META } from './types';
import { createGame, applyAction, playerScore } from './engine';
import { CARD_MAP } from './cards';
import { getAIAction } from './ai';
import {
  TUTORIAL_STEPS,
  createTutorialGame,
  getTutorialAIAction,
} from './tutorial';
import DeskSelect from './components/DeskSelect';
import Board from './components/Board';
import HowToPlay from './components/HowToPlay';
import WelcomeModal from './components/WelcomeModal';
import TutorialOverlay from './components/TutorialOverlay';

type AppPhase = 'home' | 'desk_select' | 'playing' | 'game_over';

function randomDeskExcluding(exclude: Desk): Desk {
  const desks: Desk[] = ['rates', 'equities', 'commodities', 'fx', 'macro'];
  return desks.filter(d => d !== exclude)[Math.floor(Math.random() * 4)];
}

// ─── Console logging ──────────────────────────────────────────

function logAction(action: Action, stateBefore: GameState, stateAfter: GameState, who: string) {
  const c = {
    header:  'color:#D4614D;font-weight:bold;font-family:monospace',
    ind:     'color:#1B8A7A;font-family:monospace',
    trigger: 'color:#C4851C;font-weight:bold;font-family:monospace',
    effect:  'color:#7B5EA7;font-family:monospace',
    chain:   'color:#8A8A96;font-style:italic;font-family:monospace',
    pass:    'color:#8A8A96;font-family:monospace',
  };
  if (action.type === 'play_card') {
    const pi = stateBefore.currentPlayer;
    const card = stateBefore.players[pi].hand.find(c => c.instanceId === action.instanceId);
    const def = card ? CARD_MAP[card.defId] : null;
    console.group(`%c[MACRO] ${who} plays "${def?.name ?? '?'}" → ${action.lane}`, c.header);
    if (def?.chain) console.log(`%c  ↳ ${def.chain}`, c.chain);
  } else {
    console.log(`%c[MACRO] ${who} passes`, c.pass);
    return;
  }
  for (const step of stateAfter.transmissionSteps) {
    switch (step.type) {
      case 'indicator_change': console.log(`%c  ${step.indicator?.toUpperCase()}: ${step.from} → ${step.to}  (${step.reason})`, c.ind); break;
      case 'auto_trigger':    console.log(`%c  AUTO: ${step.reason}`, c.trigger); break;
      case 'position_effect': console.log(`%c  POS: ${step.reason}`, c.effect); break;
      case 'direct_effect':   console.log(`%c  FX: ${step.reason}`, c.effect); break;
      case 'chain_text':      console.log(`%c  ${step.reason}`, c.chain); break;
    }
  }
  console.groupEnd();
}

// ─── App ──────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('home');
  const [showWelcome, setShowWelcome] = useState(true);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showingTransmission, setShowingTransmission] = useState(false);
  const [pendingTransmission, setPendingTransmission] = useState<GameState['transmissionSteps']>([]);

  // Tutorial state
  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialAiTurn, setTutorialAiTurn] = useState(0);

  // Refs
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const afterTransmissionRef = useRef<(() => void) | null>(null);
  // Keep a stable ref to advanceTutorialStep to avoid stale closures
  const advanceRef = useRef<() => void>(() => {});

  useEffect(() => {
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, []);

  // ─── Tutorial: advance step ────────────────────────────────

  // Run scripted AI move (called by advanceTutorialStep when next step is wait_ai)
  const runScriptedAI = useCallback(() => {
    setGameState(current => {
      if (!current || current.phase !== 'playing') return current;
      const aiAction = getTutorialAIAction(current, tutorialAiTurn);
      const afterAI = applyAction(current, aiAction);
      logAction(aiAction, current, afterAI, 'AI');
      setTutorialAiTurn(t => t + 1);

      if (afterAI.transmissionSteps.length > 0) {
        setPendingTransmission(afterAI.transmissionSteps);
        setShowingTransmission(true);
        // After chain closes → advance again
        afterTransmissionRef.current = () => advanceRef.current();
      } else {
        // No chain — advance immediately
        setTimeout(() => advanceRef.current(), 400);
      }
      return afterAI;
    });
  }, [tutorialAiTurn]);

  const advanceTutorialStep = useCallback(() => {
    setTutorialStep(prev => {
      const next = prev + 1;
      if (next >= TUTORIAL_STEPS.length) return prev;
      const nextStep = TUTORIAL_STEPS[next];
      // If the next step waits for AI, schedule the scripted move
      if (nextStep.action === 'wait_ai') {
        aiTimerRef.current = setTimeout(() => runScriptedAI(), 900);
      }
      return next;
    });
  }, [runScriptedAI]);

  // Keep ref in sync so closures always call the latest version
  useEffect(() => {
    advanceRef.current = advanceTutorialStep;
  }, [advanceTutorialStep]);

  // ─── Start tutorial ────────────────────────────────────────

  const startTutorial = useCallback(() => {
    const game = createTutorialGame();
    setGameState(game);
    setIsTutorial(true);
    setTutorialStep(0);
    setTutorialAiTurn(0);
    setPhase('playing');
    console.log('%c[MACRO] ══ Tutorial mode started ══', 'color:#1B8A7A;font-weight:bold;font-family:monospace');
  }, []);

  const endTutorial = useCallback(() => {
    setIsTutorial(false);
    setGameState(null);
    setTutorialStep(0);
    setTutorialAiTurn(0);
    setPhase('desk_select');
    console.log('%c[MACRO] Tutorial complete — starting real game', 'color:#1B8A7A;font-family:monospace');
  }, []);

  // ─── Navigation ────────────────────────────────────────────

  const handleStart = useCallback(() => setPhase('desk_select'), []);

  const handleDeskSelect = useCallback((desk: Desk) => {
    const aiDesk = randomDeskExcluding(desk);
    const newGame = createGame(desk, aiDesk);
    console.log(`%c[MACRO] ══ New game — You: ${DESK_META[desk].name} vs AI: ${DESK_META[aiDesk].name} ══`, 'color:#D4614D;font-weight:bold;font-family:monospace');
    setGameState(newGame);
    setPhase('playing');
  }, []);

  const handleRestart = useCallback(() => {
    setGameState(null);
    setShowingTransmission(false);
    setPendingTransmission([]);
    setIsTutorial(false);
    setPhase('home');
    setShowWelcome(false); // don't show modal again
  }, []);

  // ─── Transmission complete ─────────────────────────────────

  const handleTransmissionComplete = useCallback(() => {
    setShowingTransmission(false);
    setPendingTransmission([]);

    // Run any queued post-transmission callback (tutorial step advances, AI moves)
    if (afterTransmissionRef.current) {
      const cb = afterTransmissionRef.current;
      afterTransmissionRef.current = null;
      cb();
      return;
    }

    // Normal mode: trigger AI if it's their turn
    if (isTutorial) return; // tutorial AI is driven by advanceTutorialStep

    setGameState(prev => {
      if (!prev || prev.phase !== 'playing') return prev;
      if (prev.currentPlayer === 1) {
        aiTimerRef.current = setTimeout(() => {
          setGameState(current => {
            if (!current || current.phase !== 'playing' || current.currentPlayer !== 1) return current;
            const aiAction = getAIAction(current);
            const afterAI = applyAction(current, aiAction);
            logAction(aiAction, current, afterAI, 'AI');
            if (afterAI.transmissionSteps.length > 0) {
              setPendingTransmission(afterAI.transmissionSteps);
              setShowingTransmission(true);
            }
            if (afterAI.phase === 'game_over') setPhase('game_over');
            return afterAI;
          });
        }, 600);
      }
      return prev;
    });
  }, [isTutorial]);

  // ─── Player action ─────────────────────────────────────────

  const handlePlayerAction = useCallback((action: Action) => {
    if (!gameState || gameState.phase !== 'playing') return;

    // Check if this satisfies the current tutorial step
    let tutorialSatisfied = false;
    if (isTutorial) {
      const step = TUTORIAL_STEPS[tutorialStep];
      if (step.action === 'play_position' && action.type === 'play_card') {
        const card = gameState.players[0].hand.find(c => c.instanceId === action.instanceId);
        if (CARD_MAP[card?.defId ?? '']?.type === 'position') tutorialSatisfied = true;
      }
      if (step.action === 'play_catalyst' && action.type === 'play_card') {
        const card = gameState.players[0].hand.find(c => c.instanceId === action.instanceId);
        if (CARD_MAP[card?.defId ?? '']?.type === 'catalyst') tutorialSatisfied = true;
      }
      if (step.action === 'player_pass' && action.type === 'pass') {
        tutorialSatisfied = true;
      }
    }

    const newState = applyAction(gameState, action);
    logAction(action, gameState, newState, 'YOU');

    if (newState.transmissionSteps.length > 0) {
      setPendingTransmission(newState.transmissionSteps);
      setShowingTransmission(true);
      if (tutorialSatisfied) {
        afterTransmissionRef.current = () => advanceRef.current();
      }
    } else {
      if (tutorialSatisfied) advanceTutorialStep();
    }

    setGameState(newState);
    if (newState.phase === 'game_over') { setPhase('game_over'); return; }

    // Normal mode AI scheduling (not tutorial)
    if (!isTutorial && newState.transmissionSteps.length === 0 && newState.currentPlayer === 1 && newState.phase === 'playing') {
      aiTimerRef.current = setTimeout(() => {
        setGameState(current => {
          if (!current || current.phase !== 'playing' || current.currentPlayer !== 1) return current;
          const aiAction = getAIAction(current);
          const afterAI = applyAction(current, aiAction);
          logAction(aiAction, current, afterAI, 'AI');
          if (afterAI.transmissionSteps.length > 0) {
            setPendingTransmission(afterAI.transmissionSteps);
            setShowingTransmission(true);
          }
          if (afterAI.phase === 'game_over') setPhase('game_over');
          return afterAI;
        });
      }, 600);
    }
  }, [gameState, isTutorial, tutorialStep, advanceTutorialStep]);

  // ─── Render ────────────────────────────────────────────────

  const currentTutorialStepDef = TUTORIAL_STEPS[tutorialStep];

  return (
    <div className="app-container" style={{ paddingBottom: isTutorial ? '200px' : undefined }}>
      <header className="masthead">
        <h1>MACRO</h1>
        <div className="edition">The Macro Trading Card Game</div>
      </header>

      {/* Home */}
      {phase === 'home' && (
        <>
          <HowToPlay onStart={handleStart} />
          {showWelcome && (
            <WelcomeModal
              onYes={() => { setShowWelcome(false); handleStart(); }}
              onNo={() => { setShowWelcome(false); startTutorial(); }}
            />
          )}
        </>
      )}

      {/* Desk Select */}
      {phase === 'desk_select' && <DeskSelect onSelect={handleDeskSelect} />}

      {/* Playing */}
      {phase === 'playing' && gameState && (
        <>
          <Board
            state={gameState}
            onAction={handlePlayerAction}
            transmissionSteps={pendingTransmission}
            showingTransmission={showingTransmission}
            onTransmissionComplete={handleTransmissionComplete}
            tutorialHighlight={isTutorial ? currentTutorialStepDef?.highlight : undefined}
          />
          {isTutorial && currentTutorialStepDef && (
            <TutorialOverlay
              step={currentTutorialStepDef}
              stepIdx={tutorialStep}
              transmissionActive={showingTransmission}
              onNext={advanceTutorialStep}
              onSkip={endTutorial}
              onComplete={endTutorial}
            />
          )}
        </>
      )}

      {/* Game Over */}
      {phase === 'game_over' && gameState && (
        <div style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
          <h2 style={{ marginBottom: 'var(--space-md)' }}>
            {gameState.winner === 0 ? 'Victory' : 'Defeat'}
          </h2>
          <div style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.4rem',
            color: gameState.winner === 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
            marginBottom: 'var(--space-md)',
          }}>
            {gameState.winner === 0 ? 'Your desk outperformed.' : 'The AI desk outperformed.'}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--space-lg)',
            marginBottom: 'var(--space-xl)',
            padding: 'var(--space-lg)',
            background: 'var(--bg-surface)',
            border: 'var(--border-light)',
          }}>
            {([0, 1] as const).map(pi => {
              const p = gameState.players[pi];
              const score = playerScore(p, gameState.indicators);
              return (
                <div key={pi}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-caption)', marginBottom: '4px' }}>
                    {pi === 0 ? 'You' : 'AI'} ({DESK_META[p.desk].name})
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {p.quarterWins}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-caption)' }}>quarters won</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700, color: score >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)', marginTop: '4px' }}>
                    P&L: {score >= 0 ? '+' : ''}{score}
                  </div>
                </div>
              );
            })}
          </div>
          <button className="btn-primary" onClick={handleRestart}>New Game</button>
        </div>
      )}
    </div>
  );
}
