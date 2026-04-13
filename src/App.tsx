import { useState, useCallback, useEffect, useRef } from 'react';
import {
  GameState, Desk, Action, DESK_META,
} from './types';
import { createGame, applyAction, playerScore } from './engine';
import { CARD_MAP } from './cards';
import { getAIAction } from './ai';
import DeskSelect from './components/DeskSelect';
import Board from './components/Board';
import HowToPlay from './components/HowToPlay';

type AppPhase = 'home' | 'desk_select' | 'playing' | 'game_over';

function randomDeskExcluding(exclude: Desk): Desk {
  const desks: Desk[] = ['rates', 'equities', 'commodities', 'fx', 'macro'];
  const filtered = desks.filter(d => d !== exclude);
  return filtered[Math.floor(Math.random() * filtered.length)];
}

// ─── Console logging ─────────────────────────────────────────

function logAction(action: Action, stateBefore: GameState, stateAfter: GameState, who: string) {
  const c = {
    header:    'color:#D4614D;font-weight:bold;font-family:monospace',
    indicator: 'color:#1B8A7A;font-family:monospace',
    trigger:   'color:#C4851C;font-weight:bold;font-family:monospace',
    effect:    'color:#7B5EA7;font-family:monospace',
    chain:     'color:#8A8A96;font-style:italic;font-family:monospace',
    pass:      'color:#8A8A96;font-family:monospace',
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
      case 'indicator_change':
        console.log(`%c  ${step.indicator?.toUpperCase()}: ${step.from} → ${step.to}  (${step.reason})`, c.indicator);
        break;
      case 'auto_trigger':
        console.log(`%c  AUTO TRIGGER: ${step.reason}`, c.trigger);
        break;
      case 'position_effect':
        console.log(`%c  POSITION: ${step.reason}`, c.effect);
        break;
      case 'direct_effect':
        console.log(`%c  EFFECT: ${step.reason}`, c.effect);
        break;
      case 'chain_text':
        console.log(`%c  ${step.reason}`, c.chain);
        break;
    }
  }

  console.groupEnd();
}

function logQuarter(state: GameState) {
  const s0 = playerScore(state.players[0], state.indicators);
  const s1 = playerScore(state.players[1], state.indicators);
  console.log(
    `%c[MACRO] ── Quarter ${state.quarter} ends. You: ${s0 >= 0 ? '+' : ''}${s0} | AI: ${s1 >= 0 ? '+' : ''}${s1}`,
    'color:#2D3A5C;font-weight:bold;font-family:monospace'
  );
}

// ─── App ─────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [showingTransmission, setShowingTransmission] = useState(false);
  const [pendingTransmission, setPendingTransmission] = useState<GameState['transmissionSteps']>([]);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (aiTimerRef.current) clearTimeout(aiTimerRef.current); };
  }, []);

  const handleStart = useCallback(() => setPhase('desk_select'), []);

  const handleDeskSelect = useCallback((desk: Desk) => {
    const aiDesk = randomDeskExcluding(desk);
    const newGame = createGame(desk, aiDesk);
    console.log(
      `%c[MACRO] ══ New game — You: ${DESK_META[desk].name} vs AI: ${DESK_META[aiDesk].name} ══`,
      'color:#D4614D;font-weight:bold;font-family:monospace'
    );
    setGameState(newGame);
    setPhase('playing');
  }, []);

  const processNewState = useCallback((newState: GameState, prevState: GameState, action: Action, who: string) => {
    logAction(action, prevState, newState, who);

    // Log quarter transitions
    if (newState.quarter !== prevState.quarter || newState.phase === 'game_over') {
      logQuarter(prevState);
    }

    if (newState.transmissionSteps.length > 0) {
      setPendingTransmission(newState.transmissionSteps);
      setShowingTransmission(true);
    }
    setGameState(newState);

    if (newState.phase === 'game_over') {
      setPhase('game_over');
      console.log(
        `%c[MACRO] ══ Game over — ${newState.winner === 0 ? 'YOU WIN' : 'AI WINS'} ══`,
        'color:#D4614D;font-weight:bold;font-family:monospace'
      );
    }
  }, []);

  const handleTransmissionComplete = useCallback(() => {
    setShowingTransmission(false);
    setPendingTransmission([]);

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
  }, []);

  const handlePlayerAction = useCallback((action: Action) => {
    if (!gameState || gameState.phase !== 'playing') return;

    const newState = applyAction(gameState, action);
    logAction(action, gameState, newState, 'YOU');

    if (newState.transmissionSteps.length > 0) {
      setPendingTransmission(newState.transmissionSteps);
      setShowingTransmission(true);
    }
    setGameState(newState);

    if (newState.phase === 'game_over') {
      setPhase('game_over');
      return;
    }

    if (newState.transmissionSteps.length === 0 && newState.currentPlayer === 1 && newState.phase === 'playing') {
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
  }, [gameState]);

  const handleRestart = useCallback(() => {
    setGameState(null);
    setShowingTransmission(false);
    setPendingTransmission([]);
    setPhase('home');
  }, []);

  return (
    <div className="app-container">
      <header className="masthead">
        <h1>MACRO</h1>
        <div className="edition">The Macro Trading Card Game</div>
      </header>

      {/* Home + How to Play */}
      {phase === 'home' && <HowToPlay onStart={handleStart} />}

      {/* Desk Select */}
      {phase === 'desk_select' && <DeskSelect onSelect={handleDeskSelect} />}

      {/* Playing */}
      {phase === 'playing' && gameState && (
        <Board
          state={gameState}
          onAction={handlePlayerAction}
          transmissionSteps={pendingTransmission}
          showingTransmission={showingTransmission}
          onTransmissionComplete={handleTransmissionComplete}
        />
      )}

      {/* Game Over */}
      {phase === 'game_over' && gameState && (
        <div style={{
          maxWidth: '600px',
          margin: '0 auto',
          textAlign: 'center',
          padding: 'var(--space-xl) 0',
        }}>
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
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.6rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: 'var(--text-caption)',
                    marginBottom: '4px',
                  }}>
                    {pi === 0 ? 'You' : 'AI'} ({DESK_META[p.desk].name})
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '2rem',
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                  }}>
                    {p.quarterWins}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'var(--text-caption)',
                  }}>
                    quarters won
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: score >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
                    marginTop: '4px',
                  }}>
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
