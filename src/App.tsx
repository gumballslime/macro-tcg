import { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Desk, Action, DESK_META } from './types';
import { createGame, applyAction, playerScore } from './engine';
import { CARD_MAP } from './cards';
import { getAIAction } from './ai';
import {
  TUTORIAL_STEPS,
  createTutorialGame,
  getTutorialAIAction,
  getTutorialSteps,
  TutorialLevel,
} from './tutorial';
import DeskSelect from './components/DeskSelect';
import Board from './components/Board';
import HowToPlay from './components/HowToPlay';
import WelcomeModal from './components/WelcomeModal';
import TutorialOverlay from './components/TutorialOverlay';
import TransmissionChain from './components/TransmissionChain';
import StoryNarrative from './components/StoryNarrative';
import StoryResult from './components/StoryResult';
import StoryMissionBar from './components/StoryMissionBar';
import DeckBuilder from './components/DeckBuilder';
import {
  CHAPTERS, StoryState, createStoryGame, getStoryAIAction, getStartingDeck,
} from './story';
import SettingsPanel from './components/SettingsPanel';

type AppPhase = 'home' | 'desk_select' | 'playing' | 'game_over'
  | 'story_select' | 'story_narrative' | 'story_playing' | 'story_epilogue'
  | 'story_result' | 'story_deckbuild' | 'story_gameover' | 'story_victory';

function randomDesk(): Desk {
  const desks: Desk[] = ['rates', 'equities', 'commodities', 'fx', 'macro'];
  return desks[Math.floor(Math.random() * desks.length)];
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
  const pi = stateBefore.currentPlayer;
  if (action.type === 'play_card') {
    const card = stateBefore.players[pi].hand.find(c => c.instanceId === action.instanceId);
    const def = card ? CARD_MAP[card.defId] : null;
    console.group(`%c[MACRO] ${who} plays "${def?.name ?? '?'}" → ${action.lane}`, c.header);
    if (def?.chain) console.log(`%c  ↳ ${def.chain}`, c.chain);
  } else if (action.type === 'set_card') {
    const card = stateBefore.players[pi].hand.find(c => c.instanceId === action.instanceId);
    const def = card ? CARD_MAP[card.defId] : null;
    console.group(`%c[MACRO] ${who} sets "${def?.name ?? '?'}" face-down`, c.header);
  } else if (action.type === 'activate_quickplay') {
    const card = [...stateBefore.players[pi].hand, ...stateBefore.players[pi].trapZone].find(c => c.instanceId === action.instanceId);
    const def = card ? CARD_MAP[card.defId] : null;
    console.group(`%c[MACRO] ${who} ⚡ activates "${def?.name ?? '?'}"`, c.header);
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
  const [autoConfirmTransmission, setAutoConfirmTransmission] = useState(false);
  const [lastPlayedCardName, setLastPlayedCardName] = useState<string | undefined>();

  // Settings
  const [difficulty, setDifficulty] = useState<'easy' | 'normal' | 'advanced'>('normal');
  const [aiLevel, setAiLevel] = useState<'passive' | 'standard' | 'aggressive'>('standard');
  const [showSettings, setShowSettings] = useState(false);

  // Story mode state
  const [isStoryMode, setIsStoryMode] = useState(false);
  const [storyState, setStoryState] = useState<StoryState | null>(null);
  const [storyCapitalBefore, setStoryCapitalBefore] = useState(0);

  // Tutorial state
  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialLevel, setTutorialLevel] = useState<TutorialLevel>('beginner');
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
      const nextStep = getTutorialSteps(tutorialLevel)[next];
      // If the next step waits for AI, schedule the scripted move
      if (nextStep.action === 'wait_ai') {
        aiTimerRef.current = setTimeout(() => runScriptedAI(), 900);
      }
      // If the next step requires a player action, ensure it's the player's turn
      if (nextStep.action && nextStep.action !== 'wait_ai') {
        setGameState(gs => {
          if (!gs || gs.currentPlayer === 0) return gs;
          const fixed = { ...gs, currentPlayer: 0 as const };
          return fixed;
        });
      }
      return next;
    });
  }, [runScriptedAI]);

  const goBackTutorialStep = useCallback(() => {
    setTutorialStep(prev => Math.max(0, prev - 1));
  }, []);

  // Keep ref in sync so closures always call the latest version
  useEffect(() => {
    advanceRef.current = advanceTutorialStep;
  }, [advanceTutorialStep]);

  // ─── Start tutorial ────────────────────────────────────────

  const startTutorial = useCallback((level: TutorialLevel = 'beginner') => {
    const game = createTutorialGame(level);
    setGameState(game);
    setIsTutorial(true);
    setTutorialLevel(level);
    setTutorialStep(0);
    setTutorialAiTurn(0);
    setDifficulty(level === 'beginner' ? 'easy' : level === 'intermediate' ? 'normal' : 'advanced');
    setPhase('playing');
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
    const aiDesk = randomDesk();
    const newGame = createGame(desk, aiDesk, difficulty, aiLevel);
    console.log(`%c[MACRO] ══ New game — You: ${DESK_META[desk].name} vs AI: ${DESK_META[aiDesk].name} ══`, 'color:#D4614D;font-weight:bold;font-family:monospace');
    setGameState(newGame);
    setPhase('playing');
  }, [difficulty, aiLevel]);

  const handleRestart = useCallback(() => {
    setGameState(null);
    setShowingTransmission(false);
    setPendingTransmission([]);
    setIsTutorial(false);
    setIsStoryMode(false);
    setStoryState(null);
    setPhase('home');
    setShowWelcome(false);
  }, []);

  // ─── Settings ──────────────────────────────────────────────

  const handleChangeDifficulty = useCallback((d: 'easy' | 'normal' | 'advanced') => {
    setDifficulty(d);
    setGameState(gs => gs ? { ...gs, difficulty: d } : gs);
  }, []);

  const handleChangeAI = useCallback((a: 'passive' | 'standard' | 'aggressive') => {
    setAiLevel(a);
    setGameState(gs => gs ? { ...gs, aiLevel: a } : gs);
  }, []);

  // ─── Story Mode ───────────────────────────────────────────

  const handleStartStory = useCallback(() => setPhase('story_select'), []);

  const handleStoryDeskSelect = useCallback((desk: Desk) => {
    setStoryState({ currentChapter: 0, playerDesk: desk, deck: getStartingDeck(desk), capital: 30, results: [] });
    setIsStoryMode(true);
    setPhase('story_narrative');
  }, []);

  const handleStoryBeginChapter = useCallback(() => {
    if (!storyState) return;
    const chapter = CHAPTERS[storyState.currentChapter];
    const { game, aiDesk } = createStoryGame(chapter, storyState.deck, storyState.playerDesk, storyState.capital, difficulty, aiLevel);
    setGameState(game);
    setStoryState(prev => prev ? { ...prev, aiDesk } : prev);
    setStoryCapitalBefore(storyState.capital);
    setPhase('story_playing');
  }, [storyState]);

  const handleStoryChapterEnd = useCallback(() => {
    if (!gameState || !storyState) return;
    const pScore = playerScore(gameState.players[0], gameState.indicators);
    const aScore = playerScore(gameState.players[1], gameState.indicators);
    const won = pScore > aScore;
    const capitalDelta = won ? 3 : -2;
    const newCapital = Math.max(1, storyState.capital + capitalDelta);

    setStoryState(prev => prev ? {
      ...prev,
      capital: newCapital,
      results: [...prev.results, { won, pScore, aScore }],
    } : prev);
    setPhase('story_epilogue');
  }, [gameState, storyState]);

  const handleStoryEpilogueDone = useCallback(() => {
    setPhase('story_result');
  }, []);

  const handleStoryResultContinue = useCallback(() => {
    if (!storyState) return;
    const chapter = CHAPTERS[storyState.currentChapter];

    // Check game over conditions
    if (storyState.capital <= 0) { setPhase('story_gameover'); return; }
    if (storyState.currentChapter + 1 >= CHAPTERS.length) { setPhase('story_victory'); return; }

    // If chapter has rewards, go to deck builder; otherwise advance
    if (chapter.rewardPool.length > 0) {
      setPhase('story_deckbuild');
    } else {
      setStoryState(prev => prev ? { ...prev, currentChapter: prev.currentChapter + 1 } : prev);
      setPhase('story_narrative');
    }
  }, [storyState]);

  const handleStoryDeckConfirm = useCallback((newDeck: string[]) => {
    setStoryState(prev => prev ? { ...prev, deck: newDeck, currentChapter: prev.currentChapter + 1 } : prev);
    setGameState(null);
    setPhase('story_narrative');
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
            const aiAction = isStoryMode && storyState ? getStoryAIAction(current, CHAPTERS[storyState.currentChapter]?.aiAggression ?? 0.5) : getAIAction(current);
            const afterAI = applyAction(current, aiAction);
            logAction(aiAction, current, afterAI, 'AI');
            // Resolve AI card name for transmission header
            if (aiAction.type === 'play_card' || aiAction.type === 'set_card' || aiAction.type === 'activate_quickplay') {
              const aiCard = current.players[1].hand.find(c => c.instanceId === aiAction.instanceId)
                ?? current.players[1].trapZone.find(c => c.instanceId === aiAction.instanceId);
              setLastPlayedCardName(aiCard ? CARD_MAP[aiCard.defId]?.name : undefined);
            } else {
              setLastPlayedCardName(undefined);
            }
            if (afterAI.transmissionSteps.length > 0) {
              setPendingTransmission(afterAI.transmissionSteps);
              setShowingTransmission(true);
            }
            if (afterAI.phase === 'game_over') { if (isStoryMode) handleStoryChapterEnd(); else setPhase('game_over'); }
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
      const step = getTutorialSteps(tutorialLevel)[tutorialStep];
      if (step.action === 'play_position' && action.type === 'play_card') {
        const card = gameState.players[0].hand.find(c => c.instanceId === action.instanceId);
        const t = CARD_MAP[card?.defId ?? '']?.type;
        if (t === 'position') tutorialSatisfied = true;
      }
      if (step.action === 'play_catalyst' && action.type === 'play_card') {
        const card = gameState.players[0].hand.find(c => c.instanceId === action.instanceId);
        const ct = CARD_MAP[card?.defId ?? '']?.type;
        if (ct === 'catalyst' || ct === 'quickplay') tutorialSatisfied = true;
      }
      if (step.action === 'player_pass' && action.type === 'pass') {
        tutorialSatisfied = true;
      }
    }

    // Resolve card name for transmission header
    if (action.type === 'play_card' || action.type === 'set_card' || action.type === 'activate_quickplay') {
      const card = gameState.players[0].hand.find(c => c.instanceId === action.instanceId)
        ?? gameState.players[0].trapZone.find(c => c.instanceId === action.instanceId);
      setLastPlayedCardName(card ? CARD_MAP[card.defId]?.name : undefined);
    } else {
      setLastPlayedCardName(undefined);
    }

    const newState = applyAction(gameState, action);
    logAction(action, gameState, newState, 'YOU');

    // In tutorial mode, keep it the player's turn unless the next step is wait_ai
    if (isTutorial && tutorialSatisfied) {
      const nextStepIdx = tutorialStep + 1;
      const nextStep = getTutorialSteps(tutorialLevel)[nextStepIdx];
      if (!nextStep || nextStep.action !== 'wait_ai') {
        newState.currentPlayer = 0;
      }
    }

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
    if (newState.phase === 'game_over') { if (isStoryMode) handleStoryChapterEnd(); else setPhase('game_over'); return; }

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
          if (afterAI.phase === 'game_over') { if (isStoryMode) handleStoryChapterEnd(); else setPhase('game_over'); }
          return afterAI;
        });
      }, 600);
    }
  }, [gameState, isTutorial, tutorialStep, advanceTutorialStep]);

  // ─── Render ────────────────────────────────────────────────

  const tutorialSteps = getTutorialSteps(tutorialLevel);
  const currentTutorialStepDef = tutorialSteps[tutorialStep];

  return (
    <>
    <div className="app-container">
      <header className="masthead" style={{ position: 'relative' }}>
        <h1>MACRO</h1>
        <div className="edition">The Macro Trading Card Game</div>
        {(phase === 'playing' || phase === 'story_playing') && (
          <button onClick={() => setShowSettings(true)} style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: '1px solid rgba(26,26,46,0.2)', borderRadius: '4px',
            padding: '4px 8px', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-caption)',
          }}>
            ⚙
          </button>
        )}
      </header>

      {/* Home */}
      {phase === 'home' && (
        <>
          <HowToPlay onStart={handleStart} />
          <div style={{ textAlign: 'center', padding: 'var(--space-md) 0' }}>
            <button className="btn-salmon" onClick={handleStartStory} style={{ fontSize: '1rem', padding: '10px 32px' }}>
              Story Mode — Financial History
            </button>
          </div>
          {showWelcome && (
            <WelcomeModal
              onQuickPlay={() => { setShowWelcome(false); handleStart(); }}
              onTutorial={(level) => { setShowWelcome(false); startTutorial(level); }}
              onStory={() => { setShowWelcome(false); handleStartStory(); }}
              onClose={() => setShowWelcome(false)}
            />
          )}
        </>
      )}

      {/* Desk Select */}
      {phase === 'desk_select' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', padding: 'var(--space-md) 0 0', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Difficulty</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['easy', 'normal', 'advanced'] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} className={difficulty === d ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>AI</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['passive', 'standard', 'aggressive'] as const).map(a => (
                  <button key={a} onClick={() => setAiLevel(a)} className={aiLevel === a ? 'btn-salmon' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DeskSelect onSelect={handleDeskSelect} />
        </>
      )}

      {/* Playing */}
      {phase === 'playing' && gameState && (
        <>
          <Board
            state={gameState}
            onAction={handlePlayerAction}
            showingTransmission={showingTransmission}
            onTransmissionComplete={handleTransmissionComplete}
            tutorialHighlight={isTutorial ? currentTutorialStepDef?.highlight : undefined}
          />
          {isTutorial && currentTutorialStepDef && (
            <TutorialOverlay
              step={currentTutorialStepDef}
              stepIdx={tutorialStep}
              totalSteps={tutorialSteps.length}
              transmissionActive={showingTransmission}
              onNext={advanceTutorialStep}
              onPrev={goBackTutorialStep}
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

      {/* Story Mode: Desk Select */}
      {phase === 'story_select' && (
        <>
          <div style={{ textAlign: 'center', padding: 'var(--space-md) 0 0' }}>
            <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: 'var(--space-sm)' }}>Story Mode — Financial History</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-md)', padding: 'var(--space-sm) 0', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>Difficulty</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['easy', 'normal', 'advanced'] as const).map(d => (
                  <button key={d} onClick={() => setDifficulty(d)} className={difficulty === d ? 'btn-primary' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>AI</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['passive', 'standard', 'aggressive'] as const).map(a => (
                  <button key={a} onClick={() => setAiLevel(a)} className={aiLevel === a ? 'btn-salmon' : 'btn-secondary'} style={{ padding: '4px 12px', fontSize: '0.7rem', textTransform: 'uppercase' }}>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DeskSelect onSelect={handleStoryDeskSelect} />
        </>
      )}

      {/* Story Mode: Narrative (intro) */}
      {phase === 'story_narrative' && storyState && (
        <StoryNarrative
          chapter={CHAPTERS[storyState.currentChapter]}
          chapterIndex={storyState.currentChapter}
          totalChapters={CHAPTERS.length}
          onContinue={handleStoryBeginChapter}
        />
      )}

      {/* Story Mode: Playing */}
      {phase === 'story_playing' && gameState && storyState && (
        <>
          <StoryMissionBar
            chapter={CHAPTERS[storyState.currentChapter]}
            chapterIndex={storyState.currentChapter}
            totalChapters={CHAPTERS.length}
            capital={storyState.capital}
          />
          <Board
            state={gameState}
            onAction={handlePlayerAction}
            showingTransmission={showingTransmission}
            onTransmissionComplete={handleTransmissionComplete}
          />
        </>
      )}

      {/* Story Mode: Epilogue */}
      {phase === 'story_epilogue' && storyState && (
        <StoryNarrative
          chapter={CHAPTERS[storyState.currentChapter]}
          chapterIndex={storyState.currentChapter}
          totalChapters={CHAPTERS.length}
          isEpilogue
          onContinue={handleStoryEpilogueDone}
        />
      )}

      {/* Story Mode: Chapter Result */}
      {phase === 'story_result' && storyState && storyState.results.length > 0 && (
        <StoryResult
          chapter={CHAPTERS[storyState.currentChapter]}
          chapterIndex={storyState.currentChapter}
          totalChapters={CHAPTERS.length}
          won={storyState.results[storyState.results.length - 1].won}
          playerScore={storyState.results[storyState.results.length - 1].pScore}
          aiScore={storyState.results[storyState.results.length - 1].aScore}
          capitalBefore={storyCapitalBefore}
          capitalAfter={storyState.capital}
          onContinue={handleStoryResultContinue}
        />
      )}

      {/* Story Mode: Deck Builder */}
      {phase === 'story_deckbuild' && storyState && (
        <DeckBuilder
          deck={storyState.deck}
          rewardPool={CHAPTERS[storyState.currentChapter].rewardPool}
          rewardCount={CHAPTERS[storyState.currentChapter].rewardCount}
          onConfirm={handleStoryDeckConfirm}
        />
      )}

      {/* Story Mode: Game Over */}
      {phase === 'story_gameover' && (
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
          <h2 style={{ color: 'var(--pnl-negative)', marginBottom: 'var(--space-md)' }}>Campaign Over</h2>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-body)', marginBottom: 'var(--space-lg)' }}>
            Your capital ran out. The market claimed another trader.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-caption)', marginBottom: 'var(--space-lg)' }}>
            Chapters completed: {storyState?.results.length ?? 0} / {CHAPTERS.length}
          </div>
          <button className="btn-primary" onClick={handleRestart}>Back to Menu</button>
        </div>
      )}

      {/* Story Mode: Victory */}
      {phase === 'story_victory' && storyState && (
        <div style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: 'var(--space-xl) 0' }}>
          <h2 style={{ color: 'var(--pnl-positive)', marginBottom: 'var(--space-md)' }}>Campaign Complete</h2>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '1rem', color: 'var(--text-body)', marginBottom: 'var(--space-md)' }}>
            You survived 50 years of financial history. From Nixon to the inflation crisis — the lessons of macro are yours.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', color: 'var(--accent-teal)', fontWeight: 700, marginBottom: 'var(--space-md)' }}>
            Final Capital: {storyState.capital}$
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-caption)', marginBottom: 'var(--space-lg)' }}>
            Wins: {storyState.results.filter(r => r.won).length} / {CHAPTERS.length}
          </div>
          <button className="btn-primary" onClick={handleRestart}>Back to Menu</button>
        </div>
      )}
    </div>

    {/* Settings Panel */}
    {showSettings && (
      <SettingsPanel
        difficulty={difficulty}
        aiLevel={aiLevel}
        onChangeDifficulty={handleChangeDifficulty}
        onChangeAI={handleChangeAI}
        onClose={() => setShowSettings(false)}
      />
    )}

    {/* Transmission Chain — rendered at root level for reliable centering */}
    {showingTransmission && pendingTransmission.length > 0 && (
      <TransmissionChain
        steps={pendingTransmission}
        cardName={lastPlayedCardName}
        onComplete={handleTransmissionComplete}
        autoConfirm={autoConfirmTransmission}
        onToggleAutoConfirm={() => setAutoConfirmTransmission(v => !v)}
      />
    )}
    </>
  );
}
