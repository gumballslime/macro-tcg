import { useState, useCallback } from 'react';
import {
  GameState, Lane, LANES, LANE_META, DESK_META, Action, CardInstance,
} from '../types';
import { CARD_MAP } from '../cards';
import { playerScore, marginRatio, totalCarryingCost, marginThreshold } from '../engine';
import IndicatorPanel from './IndicatorPanel';
import CardComponent from './CardComponent';
import Hand from './Hand';
import GameLog from './GameLog';
import CardModal from './CardModal';

const LANE_COLORS: Record<Lane, string> = {
  rates: '#2D3A5C', equities: '#1B8A7A', commodities: '#C4851C', fx: '#7B5EA7',
};

interface Props {
  state: GameState;
  onAction: (action: Action) => void;
  showingTransmission: boolean;
  onTransmissionComplete: () => void;
  tutorialHighlight?: string;
}

function tutorialGlow(highlight: string | undefined, zone: string): React.CSSProperties {
  if (highlight !== zone) return {};
  return { outline: '2px solid var(--accent-teal)', outlineOffset: '2px', boxShadow: '0 0 0 4px rgba(27,138,122,0.2)', animation: 'tutorialPulse 1.5s ease-in-out infinite' };
}

export default function Board({ state, onAction, showingTransmission, onTransmissionComplete, tutorialHighlight }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<CardInstance | null>(null);
  const [pendingDeploy, setPendingDeploy] = useState<{ instanceId: string; lane: Lane } | null>(null);

  const player = state.players[0];
  const opponent = state.players[1];
  const isPlayerTurn = state.currentPlayer === 0;
  const disabled = !isPlayerTurn || showingTransmission;
  const diff = state.difficulty;
  const showLeverage = diff !== 'easy';
  const showOrders = diff !== 'easy';

  const p1Score = playerScore(player, state.indicators);
  const p2Score = playerScore(opponent, state.indicators);

  const handleCardClick = useCallback((card: CardInstance) => {
    setModalCard(card);
  }, []);

  const handleModalSelectToPlay = useCallback(() => {
    if (modalCard) setSelectedCardId(modalCard.instanceId);
    setModalCard(null);
  }, [modalCard]);

  const handleLaneClick = useCallback((lane: Lane) => {
    if (disabled || !selectedCardId) return;
    const card = player.hand.find(c => c.instanceId === selectedCardId);
    if (!card) return;
    const def = CARD_MAP[card.defId];
    if (!def) return;
    if (def.lane !== 'any' && def.lane !== lane) return;
    if (def.type === 'position') {
      if (!showLeverage) {
        // Easy mode: deploy at 1x immediately
        onAction({ type: 'play_card', instanceId: selectedCardId, lane, leverage: 1 });
        setSelectedCardId(null);
        return;
      }
      // Show leverage picker for positions
      setPendingDeploy({ instanceId: selectedCardId, lane });
      return;
    }
    onAction({ type: 'play_card', instanceId: selectedCardId, lane });
    setSelectedCardId(null);
  }, [disabled, selectedCardId, player.hand, onAction]);

  const handleDeployWithLeverage = useCallback((leverage: 1 | 2 | 3) => {
    if (!pendingDeploy) return;
    onAction({ type: 'play_card', instanceId: pendingDeploy.instanceId, lane: pendingDeploy.lane, leverage });
    setPendingDeploy(null);
    setSelectedCardId(null);
  }, [pendingDeploy, onAction]);

  const handleSkip = useCallback(() => {
    if (disabled || player.skipsUsed >= 2) return;
    setSelectedCardId(null);
    onAction({ type: 'skip' });
  }, [disabled, player.skipsUsed, onAction]);

  const handlePass = useCallback(() => {
    if (disabled) return;
    setSelectedCardId(null);
    onAction({ type: 'pass' });
  }, [disabled, onAction]);

  // Set a trap/quickplay face-down
  const handleSetCard = useCallback(() => {
    if (!selectedCardId || disabled) return;
    onAction({ type: 'set_card', instanceId: selectedCardId });
    setSelectedCardId(null);
  }, [selectedCardId, disabled, onAction]);

  // Activate a quickplay from trap zone
  const handleActivateQuickplay = useCallback((card: CardInstance) => {
    if (disabled) return;
    const def = CARD_MAP[card.defId];
    if (def?.type !== 'quickplay') return;
    onAction({ type: 'activate_quickplay', instanceId: card.instanceId });
  }, [disabled, onAction]);

  const selectedDef = selectedCardId ? (() => { const c = player.hand.find(c => c.instanceId === selectedCardId); return c ? CARD_MAP[c.defId] : null; })() : null;
  const canPlayToLane = (lane: Lane): boolean => { if (!selectedDef) return false; return selectedDef.lane === 'any' || selectedDef.lane === lane; };
  const canSetSelected = selectedDef && (selectedDef.type === 'trap' || selectedDef.type === 'quickplay');
  const modalCardPlayable = !disabled && modalCard ? player.hand.some(c => c.instanceId === modalCard.instanceId) : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Indicators */}
      <div style={{ ...tutorialGlow(tutorialHighlight, 'indicators') }}>
        <IndicatorPanel indicators={state.indicators} difficulty={diff} />
      </div>

      {/* Pending Lagged Effects */}
      {state.laggedEffects.length > 0 && (
        <div style={{ padding: '4px var(--space-md)', background: 'rgba(196,133,28,0.06)', borderBottom: 'var(--border-light)', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#C4851C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
            Lagged Effects:
          </span>
          {state.laggedEffects.map((eff, i) => (
            <span key={i} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(196,133,28,0.85)',
              background: 'rgba(196,133,28,0.1)', border: '1px solid rgba(196,133,28,0.25)',
              padding: '2px 6px', borderRadius: '3px',
            }}>
              {eff.sourceCardName}: {Object.entries(eff.indicatorChanges).map(([k, v]) => `${k} ${(v as number) > 0 ? '+' : ''}${v}`).join(', ')} (in {eff.turnsRemaining} turn{eff.turnsRemaining !== 1 ? 's' : ''})
            </span>
          ))}
        </div>
      )}

      {/* AI trap zone (hidden in easy mode) */}
      {showOrders && opponent.trapZone.length > 0 && (
        <div style={{ padding: '4px var(--space-md)', background: 'rgba(212,97,77,0.04)', borderBottom: 'var(--border-light)', display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: '#D4614D', textTransform: 'uppercase', letterSpacing: '0.08em', marginRight: '4px' }}>AI ORDERS:</span>
          {opponent.trapZone.map(c => (
            <div key={c.instanceId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
              <CardComponent card={c} indicators={state.indicators} compact onClick={() => handleCardClick(c)} />
              {c.faceDown && isPlayerTurn && player.capital >= 2 && (
                <button onClick={() => onAction({ type: 'inspect_order', instanceId: c.instanceId })} style={{
                  fontSize: '0.45rem', padding: '1px 5px', background: 'rgba(196,133,28,0.15)',
                  border: '1px solid #C4851C', color: '#C4851C', cursor: 'pointer',
                  borderRadius: '2px', fontFamily: 'var(--font-mono)',
                }}>Inspect (2$)</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Hand (card backs only) */}
      <div style={{ padding: 'var(--space-sm) var(--space-md)', background: 'rgba(26,26,46,0.04)', borderBottom: 'var(--border-medium)', ...tutorialGlow(tutorialHighlight, 'ai-hand') }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-caption)', marginBottom: '6px' }}>
          {DESK_META[opponent.desk].name} — {opponent.hand.length} card{opponent.hand.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
          {opponent.hand.map((_, i) => (
            <div key={i} style={{
              width: '44px', height: '58px', background: 'linear-gradient(145deg, #2D3A5C, #1A1A2E)',
              border: '1px solid rgba(45,58,92,0.5)', borderRadius: '3px', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', color: 'rgba(255,255,255,0.15)',
            }}>
              🃏
            </div>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-sm) var(--space-md)', borderBottom: 'var(--border-light)', background: 'var(--bg-paper)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-caption)' }}>You ({DESK_META[player.desk].name})</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: p1Score >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)' }}>{p1Score >= 0 ? '+' : ''}{p1Score}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#C4851C' }}>Capital: {player.capital}$</div>
            {diff !== 'easy' && (() => {
              const ratio = marginRatio(player);
              const thresh = marginThreshold(state.indicators);
              const color = ratio > thresh - 0.5 ? '#D4614D' : ratio > thresh - 1.5 ? '#C4851C' : '#1B8A7A';
              return ratio > 0 ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color }}>Margin: {ratio.toFixed(1)}x / {thresh.toFixed(1)}x</div>
              ) : null;
            })()}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-caption)', padding: '2px 8px', background: 'var(--bg-inset)' }}>Q{state.quarter} · {player.quarterWins}–{opponent.quarterWins}</div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-caption)' }}>AI ({DESK_META[opponent.desk].name})</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: p2Score >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)' }}>{p2Score >= 0 ? '+' : ''}{p2Score}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#C4851C' }}>Capital: {opponent.capital}$</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: isPlayerTurn ? 'var(--accent-teal)' : 'var(--text-caption)', fontWeight: isPlayerTurn ? 700 : 400 }}>
            {isPlayerTurn ? (selectedCardId ? (canSetSelected ? 'PLAY TO LANE OR SET ↓' : 'SELECT A LANE ↓') : 'YOUR TURN') : 'AI THINKING…'}
          </div>
          {showOrders && canSetSelected && isPlayerTurn && (
            <button className="btn-salmon" onClick={handleSetCard} style={{ fontSize: '0.7rem', padding: '4px 10px' }}>Set Face-Down</button>
          )}
          {player.skipsUsed < 2 && (
            <button className="btn-secondary" onClick={handleSkip} disabled={disabled} style={{ fontSize: '0.65rem', padding: '4px 12px' }}>
              Skip ({2 - player.skipsUsed})
            </button>
          )}
          <button className="btn-salmon" onClick={handlePass} disabled={disabled} style={{ fontSize: '0.75rem', padding: '4px 16px', ...tutorialGlow(tutorialHighlight, 'pass-button') }}>
            Pass
          </button>
        </div>
      </div>

      {/* Board Lanes */}
      <div style={{ padding: '0 var(--space-md)', background: 'var(--bg-paper)' }}>
        {selectedCardId && (
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--accent-salmon)', padding: 'var(--space-xs) 0', textAlign: 'center' }}>
            Click a highlighted lane to play — or click another card to change selection
          </div>
        )}

        {LANES.map(lane => {
          const meta = LANE_META[lane];
          const droppable = canPlayToLane(lane);
          const playerCards = player.board[lane];
          const opponentCards = opponent.board[lane];
          const laneColor = LANE_COLORS[lane];

          return (
            <div key={lane} style={{
              display: 'grid', gridTemplateColumns: '90px 1fr 1fr',
              gap: 'var(--space-sm)', padding: 'var(--space-sm) var(--space-sm)',
              borderBottom: 'var(--border-light)', borderLeft: `3px solid ${laneColor}`,
              background: `${laneColor}06`, minHeight: '68px', alignItems: 'start',
              ...(tutorialHighlight === lane ? tutorialGlow(tutorialHighlight, lane) : {}),
            }}>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: laneColor, paddingTop: 'var(--space-sm)' }}>
                {meta.icon} {meta.name}
              </div>

              {/* Opponent side */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '52px', padding: '4px' }}>
                {opponentCards.length === 0
                  ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'rgba(138,138,150,0.4)', alignSelf: 'center' }}>AI</span>
                  : opponentCards.map(card => (
                      <CardComponent key={card.instanceId} card={card} indicators={state.indicators} compact onClick={() => handleCardClick(card)} />
                    ))
                }
              </div>

              {/* Player side */}
              <div
                onClick={droppable ? () => handleLaneClick(lane) : undefined}
                style={{
                  display: 'flex', flexWrap: 'wrap', gap: '4px', minHeight: '52px', padding: '4px',
                  border: droppable ? `2px dashed ${laneColor}` : '1px dashed transparent',
                  background: droppable ? `${laneColor}10` : undefined,
                  cursor: droppable ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
              >
                {playerCards.length === 0 && !droppable && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'rgba(138,138,150,0.4)', alignSelf: 'center' }}>You</span>}
                {droppable && playerCards.length === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: laneColor, alignSelf: 'center', fontWeight: 700 }}>Play here</span>}
                {playerCards.map(card => (
                  <CardComponent key={card.instanceId} card={card} indicators={state.indicators} compact onClick={() => handleCardClick(card)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Trap Zone (hidden in easy mode) */}
      {showOrders && (
        <div style={{ padding: '6px var(--space-md)', background: 'rgba(212,97,77,0.03)', borderTop: '1px solid rgba(212,97,77,0.15)', borderBottom: 'var(--border-light)' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#D4614D', marginBottom: '4px' }}>
            Your Conditional Orders ({player.trapZone.length}/3)
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', minHeight: '40px', alignItems: 'center' }}>
            {player.trapZone.length === 0
              ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(138,138,150,0.3)' }}>No orders set</span>
              : player.trapZone.map(c => {
                  const def = CARD_MAP[c.defId];
                  return (
                    <div key={c.instanceId} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                      <CardComponent card={c} indicators={state.indicators} compact onClick={() => handleCardClick(c)} />
                      {def?.type === 'quickplay' && !disabled && (
                        <button onClick={() => handleActivateQuickplay(c)} style={{ fontSize: '0.5rem', padding: '2px 6px', background: 'rgba(196,133,28,0.15)', border: '1px solid #C4851C', color: '#C4851C', cursor: 'pointer', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>
                          ⚡ Activate
                        </button>
                      )}
                    </div>
                  );
                })
            }
          </div>
        </div>
      )}

      {/* Player Hand */}
      <div style={{ padding: 'var(--space-md)', background: 'var(--bg-surface)', borderTop: 'var(--border-medium)', ...tutorialGlow(tutorialHighlight, 'hand') }}>
        <Hand cards={player.hand} indicators={state.indicators} selectedId={selectedCardId} capital={player.capital} onCardClick={handleCardClick} />
      </div>

      {/* Game Log */}
      <div style={{ padding: '0 var(--space-md) var(--space-md)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-caption)', marginBottom: '4px', marginTop: 'var(--space-sm)' }}>
          Market Wire
        </div>
        <GameLog entries={state.log} />
      </div>

      {/* Leverage Picker */}
      {pendingDeploy && (() => {
        const card = player.hand.find(c => c.instanceId === pendingDeploy.instanceId);
        const def = card ? CARD_MAP[card.defId] : null;
        return (
          <div className="transmission-backdrop" onClick={() => setPendingDeploy(null)} />
        );
      })()}
      {pendingDeploy && (() => {
        const card = player.hand.find(c => c.instanceId === pendingDeploy.instanceId);
        const def = card ? CARD_MAP[card.defId] : null;
        return (
          <div className="transmission-center">
            <div style={{
              background: '#1A1A2E', border: '1px solid rgba(27,138,122,0.3)', borderRadius: '8px',
              padding: '20px 24px', width: '360px', maxWidth: '94vw', pointerEvents: 'auto',
              boxShadow: '0 24px 64px rgba(26,26,46,0.5)',
            }}>
              <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', color: '#fff', marginBottom: '4px' }}>
                Deploy {def?.name ?? 'Position'}
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
                to {pendingDeploy.lane} lane — choose leverage
              </div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                {([1, 2, 3] as const).map(lev => (
                  <button key={lev} onClick={() => handleDeployWithLeverage(lev)} style={{
                    flex: 1, padding: '10px 8px', borderRadius: '4px', cursor: 'pointer',
                    fontFamily: 'var(--font-mono)', fontSize: '1rem', fontWeight: 700,
                    background: lev === 1 ? 'rgba(27,138,122,0.2)' : lev === 2 ? 'rgba(196,133,28,0.2)' : 'rgba(212,97,77,0.2)',
                    color: lev === 1 ? '#1B8A7A' : lev === 2 ? '#C4851C' : '#D4614D',
                    border: `1px solid ${lev === 1 ? 'rgba(27,138,122,0.4)' : lev === 2 ? 'rgba(196,133,28,0.4)' : 'rgba(212,97,77,0.4)'}`,
                  }}>
                    {lev}x
                  </button>
                ))}
              </div>
              {(() => {
                const rateFactor = Math.max(0.25, state.indicators.rate / 4);
                const currentRatio = marginRatio(player);
                const cardCost = def?.cost ?? 0;
                return (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.8 }}>
                    {([1, 2, 3] as const).map(lev => {
                      const addedExposure = cardCost * lev;
                      const currentExposure = marginRatio(player) * Math.max(1, player.capital);
                      const capitalAfterPlay = Math.max(1, player.capital - cardCost);
                      const newRatio = (currentExposure + addedExposure) / capitalAfterPlay;
                      const carry = ((cardCost / 5) * rateFactor * lev).toFixed(1);
                      const ratioColor = newRatio > 2.5 ? '#D4614D' : newRatio > 1.5 ? '#C4851C' : '#1B8A7A';
                      return (
                        <div key={lev}>
                          <span style={{ color: ratioColor }}>{lev}x</span> — Funding: {carry}$/turn · Margin: {currentRatio.toFixed(1)}x → <span style={{ color: ratioColor }}>{newRatio.toFixed(1)}x</span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: '4px', fontSize: '0.48rem' }}>Margin call at {marginThreshold(state.indicators).toFixed(1)}x. Rate: {state.indicators.rate} · USD: {state.indicators.usd} · Risk: {state.indicators.risk}</div>
                  </div>
                );
              })()}
              <button onClick={() => setPendingDeploy(null)} style={{
                marginTop: '10px', width: '100%', padding: '6px', background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-mono)', fontSize: '0.65rem', cursor: 'pointer', borderRadius: '3px',
              }}>
                Cancel
              </button>
            </div>
          </div>
        );
      })()}

      {/* Card Modal */}
      {modalCard && (
        <CardModal
          card={modalCard}
          indicators={state.indicators}
          onClose={() => setModalCard(null)}
          onPlay={modalCardPlayable ? handleModalSelectToPlay : undefined}
        />
      )}
    </div>
  );
}
