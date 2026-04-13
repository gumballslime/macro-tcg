import { CardInstance, Indicators } from '../types';
import CardComponent from './CardComponent';

interface Props {
  cards: CardInstance[];
  indicators: Indicators;
  selectedId: string | null;
  onCardClick: (card: CardInstance) => void;
}

export default function Hand({ cards, indicators, selectedId, onCardClick }: Props) {
  return (
    <div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        color: 'var(--text-caption)',
        marginBottom: 'var(--space-sm)',
      }}>
        Your Hand ({cards.length} cards) — click a card to view &amp; play
      </div>
      <div style={{
        display: 'flex',
        gap: 'var(--space-sm)',
        overflowX: 'auto',
        paddingBottom: 'var(--space-sm)',
        paddingTop: '8px',
      }}>
        {cards.map(card => (
          <CardComponent
            key={card.instanceId}
            card={card}
            indicators={indicators}
            selected={selectedId === card.instanceId}
            onClick={() => onCardClick(card)}
          />
        ))}
        {cards.length === 0 && (
          <div style={{
            fontFamily: 'var(--font-body)',
            fontStyle: 'italic',
            color: 'var(--text-caption)',
            fontSize: '0.85rem',
            padding: 'var(--space-lg)',
          }}>
            No cards remaining — pass to end the quarter.
          </div>
        )}
      </div>
    </div>
  );
}
