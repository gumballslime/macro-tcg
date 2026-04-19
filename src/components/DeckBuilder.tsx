import { useState } from 'react';
import { Indicators, STARTING_INDICATORS } from '../types';
import { CARD_MAP } from '../cards';
import CardComponent from './CardComponent';

const MAX_DECK = 15;

interface Props {
  deck: string[];
  rewardPool: string[];
  rewardCount: number;
  onConfirm: (newDeck: string[]) => void;
}

export default function DeckBuilder({ deck, rewardPool, rewardCount, onConfirm }: Props) {
  const [currentDeck, setCurrentDeck] = useState<string[]>([...deck]);
  const [selectedRemove, setSelectedRemove] = useState<string | null>(null);
  const [selectedAdd, setSelectedAdd] = useState<string | null>(null);
  const [added, setAdded] = useState<string[]>([]);

  const indicators: Indicators = { ...STARTING_INDICATORS };
  const availableRewards = rewardPool.filter(id => !added.includes(id)).slice(0, rewardCount);
  const canAdd = currentDeck.length < MAX_DECK && availableRewards.length > 0;

  const handleAdd = () => {
    if (!selectedAdd || currentDeck.length >= MAX_DECK) return;
    setCurrentDeck([...currentDeck, selectedAdd]);
    setAdded([...added, selectedAdd]);
    setSelectedAdd(null);
  };

  const handleSwap = () => {
    if (!selectedRemove || !selectedAdd) return;
    const newDeck = currentDeck.filter(id => id !== selectedRemove);
    newDeck.push(selectedAdd);
    setCurrentDeck(newDeck);
    setAdded([...added, selectedAdd]);
    setSelectedRemove(null);
    setSelectedAdd(null);
  };

  const handleSkip = () => {
    onConfirm(currentDeck);
  };

  const handleConfirm = () => {
    onConfirm(currentDeck);
  };

  return (
    <div className="transmission-center" style={{ zIndex: 200 }}>
      <div style={{
        width: '700px', maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto',
        background: '#1A1A2E', border: '1px solid rgba(27,138,122,0.3)', borderRadius: '8px',
        boxShadow: '0 32px 80px rgba(26,26,46,0.6)', pointerEvents: 'auto',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.2rem', color: '#fff', fontWeight: 700 }}>
            Deck Builder
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-caption)', marginTop: '4px' }}>
            Add or swap cards. Deck: {currentDeck.length}/{MAX_DECK}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0', minHeight: '300px' }}>
          {/* Current Deck */}
          <div style={{ padding: '12px 16px', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Your Deck ({currentDeck.length})
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {currentDeck.map((defId, i) => {
                const card = { instanceId: `deck-${i}`, defId, currentPnL: CARD_MAP[defId]?.basePnL ?? 0 };
                return (
                  <div key={`${defId}-${i}`} onClick={() => setSelectedRemove(selectedRemove === defId ? null : defId)}
                    style={{ border: selectedRemove === defId ? '2px solid #D4614D' : '2px solid transparent', borderRadius: '4px' }}>
                    <CardComponent card={card} indicators={indicators} compact />
                  </div>
                );
              })}
            </div>
            {selectedRemove && (
              <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#D4614D' }}>
                Selected to remove: {CARD_MAP[selectedRemove]?.name}
              </div>
            )}
          </div>

          {/* Reward Pool */}
          <div style={{ padding: '12px 16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#C4851C', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              Available Rewards
            </div>
            {availableRewards.length === 0 ? (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', padding: '20px 0' }}>
                No rewards available
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {availableRewards.map((defId, i) => {
                  const card = { instanceId: `reward-${i}`, defId, currentPnL: CARD_MAP[defId]?.basePnL ?? 0 };
                  return (
                    <div key={defId} onClick={() => setSelectedAdd(selectedAdd === defId ? null : defId)}
                      style={{ border: selectedAdd === defId ? '2px solid #1B8A7A' : '2px solid transparent', borderRadius: '4px' }}>
                      <CardComponent card={card} indicators={indicators} compact />
                    </div>
                  );
                })}
              </div>
            )}
            {selectedAdd && (
              <div style={{ marginTop: '6px', fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#1B8A7A' }}>
                Selected to add: {CARD_MAP[selectedAdd]?.name}
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          {selectedAdd && canAdd && !selectedRemove && (
            <button onClick={handleAdd} style={{
              padding: '8px 20px', background: 'rgba(27,138,122,0.2)', border: '1px solid rgba(27,138,122,0.4)',
              color: '#1B8A7A', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
              cursor: 'pointer', borderRadius: '3px',
            }}>
              Add to Deck
            </button>
          )}
          {selectedAdd && selectedRemove && (
            <button onClick={handleSwap} style={{
              padding: '8px 20px', background: 'rgba(196,133,28,0.2)', border: '1px solid rgba(196,133,28,0.4)',
              color: '#C4851C', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
              cursor: 'pointer', borderRadius: '3px',
            }}>
              Swap Cards
            </button>
          )}
          <button onClick={added.length > 0 ? handleConfirm : handleSkip} style={{
            padding: '8px 20px', background: 'var(--accent-teal)', border: 'none',
            color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700,
            cursor: 'pointer', borderRadius: '3px',
          }}>
            {added.length > 0 ? 'Continue' : 'Skip'}
          </button>
        </div>
      </div>
    </div>
  );
}
