import { Desk, DESK_META } from '../types';

interface Props {
  onSelect: (desk: Desk) => void;
}

const DESKS: Desk[] = ['rates', 'equities', 'commodities', 'fx', 'macro'];

export default function DeskSelect({ onSelect }: Props) {
  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: 'var(--space-xl) var(--space-md)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <h2 style={{ marginBottom: 'var(--space-sm)' }}>Choose Your Trading Desk</h2>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          color: 'var(--text-caption)',
          fontSize: '0.9rem',
        }}>
          Each desk specialises in different instruments and strategies.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 'var(--space-md)',
      }}>
        {DESKS.map(desk => {
          const meta = DESK_META[desk];
          return (
            <button
              key={desk}
              onClick={() => onSelect(desk)}
              style={{
                background: 'var(--bg-paper)',
                border: 'var(--border-medium)',
                borderTop: `4px solid ${meta.color}`,
                padding: 'var(--space-lg)',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'transform 0.12s ease, box-shadow 0.12s ease',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(26, 26, 46, 0.1)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: 'var(--space-sm)' }}>
                {meta.art}
              </div>
              <div style={{
                fontFamily: 'var(--font-headline)',
                fontSize: '1.1rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                marginBottom: '4px',
              }}>
                {meta.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: meta.color,
                marginBottom: 'var(--space-sm)',
              }}>
                {meta.playstyle}
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.8rem',
                color: 'var(--text-body)',
                lineHeight: 1.5,
              }}>
                {meta.description}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
