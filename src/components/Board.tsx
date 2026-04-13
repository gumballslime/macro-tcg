import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  GameState, Lane, LANES, LANE_META, DESK_META, Action, CardInstance,
} from '../types';
import { CARD_MAP } from '../cards';
import { playerScore } from '../engine';
import IndicatorPanel from './IndicatorPanel';
import CardComponent from './CardComponent';
import Hand from './Hand';
import TransmissionChain from './TransmissionChain';
import GameLog from './GameLog';
import CardModal from './CardModal';

const LANE_COLORS: Record<Lane, string> = {
  rates:       '#2D3A5C',
  equities:    '#1B8A7A',
  commodities: '#C4851C',
  fx:          '#7B5EA7',
};

interface Props {
  state: GameState;
  onAction: (action: Action) => void;
  transmissionSteps: GameState['transmissionSteps'];
  showingTransmission: boolean;
  onTransmissionComplete: () => void;
  tutorialHighlight?: string;
}

function tutorialGlow(highlight: string | undefined, zone: string): React.CSSProperties {
  if (highlight !== zone) return {};
  return {
    outline: '2px solid var(--accent-teal)',
    outlineOffset: '2px',
    boxShadow: '0 0 0 4px rgba(27,138,122,0.2)',
    animation: 'tutorialPulse 1.5s ease-in-out infinite',
  };
}

export default function Board({
  state,
  onAction,
  transmissionSteps,
  showingTransmission,
  onTransmissionComplete,
  tutorialHighlight,
}: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [modalCard, setModalCard] = useState<CardInstance | null>(null);

  const player = state.players[0];
  const opponent = state.players[1];
  const isPlayerTurn = state.currentPlayer === 0;
  const disabled = !isPlayerTurn || showingTransmission;

  const p1Score = playerScore(player, state.indicators);
  const p2Score = playerScore(opponent, state.indicators);

  // Open modal for any card click
  const handleCardClick = useCallback((card: CardInstance) => {
    setModalCard(card);
  }, []);

  // Called from inside the modal — selects the card for playing
  const handleModalSelectToPlay = useCallback(() => {
    if (modalCard) {
      setSelectedCardId(modalCard.instanceId);
    }
    setModalCard(null);
  }, [modalCard]);

  const handleLaneClick = useCallback((lane: Lane) => {
    if (disabled || !selectedCardId) return;
    const card = player.hand.find(c => c.instanceId === selectedCardId);
    if (!card) return;
    const def = CARD_MAP[card.defId];
    if (!def) return;
    if (def.lane !== 'any' && def.lane !== lane) return;
    onAction({ type: 'play_card', instanceId: selectedCardId, lane });
    setSelectedCardId(null);
  }, [disabled, selectedCardId, player.hand, onAction]);

  const handlePass = useCallback(() => {
    if (disabled) return;
    setSelectedCardId(null);
    onAction({ type: 'pass' });
  }, [disabled, onAction]);

  const selectedDef = selectedCardId
    ? (() => {
        const card = player.hand.find(c => c.instanceId === selectedCardId);
        return card ? CARD_MAP[card.defId] : null;
      })()
    : null;

  const canPlayToLane = (lane: Lane): boolean => {
    if (!selectedDef) return false;
    return selectedDef.lane === 'any' || selectedDef.lane === lane;
  };

  // Is the modal card from the player's hand and playable?
  const modalCardPlayable = !disabled && modalCard
    ? player.hand.some(c => c.instanceId === modalCard.instanceId)
    : false;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* Indicator Panel */}
      <div style={{ ...tutorialGlow(tutorialHighlight, 'indicators') }}>
        <IndicatorPanel indicators={state.indicators} />
      </div>

      {/* AI Hand */}
      <div style={{
        padding: 'var(--space-sm) var(--space-md)',
        background: 'rgba(26,26,46,0.04)',
        borderBottom: 'var(--border-medium)',
        ...tutorialGlow(tutorialHighlight, 'ai-hand'),
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.58rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-caption)',
          marginBottom: '6px',
        }}>
          {DESK_META[opponent.desk].name} — {opponent.hand.length} card{opponent.hand.length !== 1 ? 's' : ''} in hand
        </div>
        <div style={{
          display: 'flex',
          gap: '4px',
          overflowX: 'auto',
          paddingBottom: '4px',
          minHeight: '52px',
          alignItems: 'flex-start',
        }}>
          {opponent.hand.length === 0
            ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-caption)', alignSelf: 'center' }}>No cards remaining</span>
            : opponent.hand.map(card => (
                <CardComponent
                  key={card.instanceId}
                  card={card}
                  indicators={state.indicators}
                  compact
                  onClick={() => handleCardClick(card)}
                />
              ))
          }
        </div>
      </div>

      {/* Status Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--space-sm) var(--space-md)',
        borderBottom: 'var(--border-light)',
        background: 'var(--bg-paper)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-caption)',
            }}>
              You ({DESK_META[player.desk].name})
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: p1Score >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
            }}>
              {p1Score >= 0 ? '+' : ''}{p1Score}
            </div>
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-caption)',
            padding: '2px 8px',
            background: 'var(--bg-inset)',
          }}>
            Q{state.quarter} &middot; {player.quarterWins}&#8211;{opponent.quarterWins}
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-caption)',
            }}>
              AI ({DESK_META[opponent.desk].name})
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: p2Score >= 0 ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
            }}>
              {p2Score >= 0 ? '+' : ''}{p2Score}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: isPlayerTurn ? 'var(--accent-teal)' : 'var(--text-caption)',
            fontWeight: isPlayerTurn ? 700 : 400,
          }}>
            {isPlayerTurn ? (selectedCardId ? 'SELECT A LANE ↓' : 'YOUR TURN') : 'AI THINKING…'}
          </div>
          <button
            className="btn-salmon"
            onClick={handlePass}
            disabled={disabled}
            style={{
              fontSize: '0.75rem',
              padding: '4px 16px',
              ...tutorialGlow(tutorialHighlight, 'pass-button'),
            }}
          >
            Pass
          </button>
        </div>
      </div>

      {/* Board Lanes */}
      <div style={{ padding: '0 var(--space-md)', background: 'var(--bg-paper)' }}>
        {selectedCardId && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--accent-salmon)',
            padding: 'var(--space-xs) 0',
            textAlign: 'center',
          }}>
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
            <div
              key={lane}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 1fr',
                gap: 'var(--space-sm)',
                padding: 'var(--space-sm) var(--space-sm)',
                borderBottom: 'var(--border-light)',
                borderLeft: `3px solid ${laneColor}`,
                background: `${laneColor}06`,
                minHeight: '68px',
                alignItems: 'start',
                ...(tutorialHighlight === lane ? tutorialGlow(tutorialHighlight, lane) : {}),
              }}
            >
              {/* Lane label */}
              <div style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '0.72rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: laneColor,
                paddingTop: 'var(--space-sm)',
              }}>
                {meta.icon} {meta.name}
              </div>

              {/* Opponent side */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                minHeight: '52px',
                padding: '4px',
              }}>
                {opponentCards.length === 0
                  ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'rgba(138,138,150,0.4)', alignSelf: 'center' }}>AI</span>
                  : opponentCards.map(card => (
                      <CardComponent
                        key={card.instanceId}
                        card={card}
                        indicators={state.indicators}
                        compact
                        onClick={() => handleCardClick(card)}
                      />
                    ))
                }
              </div>

              {/* Player side */}
              <div
                onClick={droppable ? () => handleLaneClick(lane) : undefined}
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '4px',
                  minHeight: '52px',
                  padding: '4px',
                  border: droppable ? `2px dashed ${laneColor}` : '1px dashed transparent',
                  background: droppable ? `${laneColor}10` : undefined,
                  cursor: droppable ? 'pointer' : 'default',
                  transition: 'background 0.15s ease',
                }}
              >
                {playerCards.length === 0 && !droppable && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.52rem', color: 'rgba(138,138,150,0.4)', alignSelf: 'center' }}>You</span>
                )}
                {droppable && playerCards.length === 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: laneColor, alignSelf: 'center', fontWeight: 700 }}>
                    Play here
                  </span>
                )}
                {playerCards.map(card => (
                  <CardComponent
                    key={card.instanceId}
                    card={card}
                    indicators={state.indicators}
                    compact
                    onClick={() => handleCardClick(card)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Player Hand */}
      <div style={{
        padding: 'var(--space-md)',
        background: 'var(--bg-surface)',
        borderTop: 'var(--border-medium)',
        ...tutorialGlow(tutorialHighlight, 'hand'),
      }}>
        <Hand
          cards={player.hand}
          indicators={state.indicators}
          selectedId={selectedCardId}
          onCardClick={handleCardClick}
        />
      </div>

      {/* Game Log */}
      <div style={{ padding: '0 var(--space-md) var(--space-md)' }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.55rem',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          color: 'var(--text-caption)',
          marginBottom: '4px',
          marginTop: 'var(--space-sm)',
        }}>
          Market Wire
        </div>
        <GameLog entries={state.log} />
      </div>

      {/* Transmission Chain */}
      <AnimatePresence>
        {showingTransmission && transmissionSteps.length > 0 && (
          <TransmissionChain
            steps={transmissionSteps}
            onComplete={onTransmissionComplete}
          />
        )}
      </AnimatePresence>

      {/* Card Detail Modal */}
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
