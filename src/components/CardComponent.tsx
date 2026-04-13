import { CardInstance, Indicators, IndicatorKey, DESK_META } from '../types';
import { CARD_MAP } from '../cards';
import { effectivePnL } from '../engine';

interface Props {
  card: CardInstance;
  indicators: Indicators;
  selected?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

const SENS_COLORS: Record<IndicatorKey, string> = {
  rate:      '#2D3A5C',
  inflation: '#D4614D',
  usd:       '#7B5EA7',
  risk:      '#1B8A7A',
};

const SENS_LABELS: Record<IndicatorKey, string> = {
  rate:      'Rate',
  inflation: 'Infl',
  usd:       'USD',
  risk:      'Risk',
};

export default function CardComponent({ card, indicators, selected, compact, onClick }: Props) {
  const def = CARD_MAP[card.defId];
  if (!def) return null;

  const ePnL = effectivePnL(card, indicators);
  const pnlChanged = ePnL !== card.currentPnL;
  const deskColor = DESK_META[def.desk].color;
  const isPositive = ePnL >= 0;
  const isFrozen = !!card.frozen;

  const sensitivities = def.sensitivities;
  const sensKeys = sensitivities
    ? (Object.keys(sensitivities) as IndicatorKey[]).filter(k => sensitivities[k])
    : [];

  // ── Compact card (on board) ──────────────────────────────────
  if (compact) {
    return (
      <div
        onClick={onClick}
        title={`${def.name} — ${def.description}`}
        style={{
          width: '88px',
          background: 'var(--bg-paper)',
          border: '1px solid rgba(26,26,46,0.18)',
          borderRadius: '3px',
          cursor: onClick ? 'pointer' : 'default',
          opacity: isFrozen ? 0.5 : 1,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 2px 6px rgba(26,26,46,0.14)',
          userSelect: 'none',
        }}
      >
        {/* Art header */}
        <div style={{
          background: deskColor,
          padding: '5px 6px 4px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>{def.art}</span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#fff',
          }}>
            {isPositive ? '+' : ''}{ePnL}
          </span>
        </div>
        {/* Name */}
        <div style={{
          padding: '3px 5px 4px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.52rem',
          color: 'var(--text-primary)',
          lineHeight: 1.3,
          fontWeight: 600,
        }}>
          {def.name}
          {isFrozen && (
            <span style={{
              display: 'block',
              color: 'var(--accent-salmon)',
              fontWeight: 700,
              fontSize: '0.5rem',
            }}>
              FROZEN {card.frozen}t
            </span>
          )}
        </div>
      </div>
    );
  }

  // ── Full card (in hand) ──────────────────────────────────────
  return (
    <div
      onClick={onClick}
      style={{
        width: '140px',
        background: 'var(--bg-paper)',
        border: selected
          ? `2px solid ${deskColor}`
          : '1px solid rgba(26,26,46,0.18)',
        borderRadius: '4px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
        transform: selected ? 'translateY(-10px)' : 'none',
        boxShadow: selected
          ? `0 10px 28px ${deskColor}50`
          : '0 2px 8px rgba(26,26,46,0.12)',
        opacity: isFrozen ? 0.5 : 1,
        flexShrink: 0,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Art area */}
      <div style={{
        background: `linear-gradient(160deg, ${deskColor} 0%, ${deskColor}cc 100%)`,
        padding: '14px 8px 10px',
        textAlign: 'center',
        position: 'relative',
        minHeight: '72px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {/* Lane badge top-left */}
        <div style={{
          position: 'absolute',
          top: '4px',
          left: '5px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.42rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.75)',
        }}>
          {def.lane === 'any' ? 'any lane' : def.lane}
        </div>
        {/* Type badge top-right */}
        <div style={{
          position: 'absolute',
          top: '4px',
          right: '5px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.42rem',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'rgba(255,255,255,0.75)',
          background: 'rgba(0,0,0,0.25)',
          padding: '1px 4px',
          borderRadius: '2px',
        }}>
          {def.type}
        </div>
        {/* Emoji art */}
        <div style={{ fontSize: '2.4rem', lineHeight: 1, marginBottom: '2px' }}>{def.art}</div>
      </div>

      {/* Card body */}
      <div style={{ padding: '8px 8px 6px' }}>
        {/* Name */}
        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '0.82rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
          marginBottom: '6px',
        }}>
          {def.name}
        </div>

        {/* P&L */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: '5px',
          marginBottom: '6px',
          padding: '4px 6px',
          background: 'var(--bg-inset)',
          borderRadius: '2px',
        }}>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.48rem',
            color: 'var(--text-caption)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            P&L
          </span>
          {pnlChanged ? (
            <>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: 'var(--text-caption)',
                textDecoration: 'line-through',
              }}>
                {card.currentPnL > 0 ? '+' : ''}{card.currentPnL}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1rem',
                fontWeight: 700,
                color: isPositive ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
              }}>
                {isPositive ? '+' : ''}{ePnL}
              </span>
            </>
          ) : (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1rem',
              fontWeight: 700,
              color: isPositive ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
            }}>
              {isPositive ? '+' : ''}{ePnL}
            </span>
          )}
        </div>

        {/* Sensitivities */}
        {sensKeys.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginBottom: '6px' }}>
            {sensKeys.map(k => {
              const val = sensitivities![k]!;
              return (
                <span
                  key={k}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.46rem',
                    padding: '1px 4px',
                    background: `${SENS_COLORS[k]}16`,
                    border: `1px solid ${SENS_COLORS[k]}35`,
                    color: SENS_COLORS[k],
                    borderRadius: '2px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {SENS_LABELS[k]} {val > 0 ? '+' : ''}{val}
                </span>
              );
            })}
          </div>
        )}

        {/* Description */}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.6rem',
          color: 'var(--text-caption)',
          lineHeight: 1.4,
          fontStyle: 'italic',
        }}>
          {def.description}
        </div>

        {/* Frozen */}
        {isFrozen && (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.55rem',
            color: 'var(--accent-salmon)',
            marginTop: '5px',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            SANCTIONED — {card.frozen} turn{card.frozen! > 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}
