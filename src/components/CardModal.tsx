import { AnimatePresence, motion } from 'framer-motion';
import { CardInstance, Indicators, IndicatorKey, DESK_META, INDICATOR_META } from '../types';
import { CARD_MAP } from '../cards';
import { effectivePnL } from '../engine';

interface Props {
  card: CardInstance | null;
  indicators: Indicators;
  onClose: () => void;
  onPlay?: () => void; // present only when card is in player's hand and it's their turn
}

const SENS_COLORS: Record<IndicatorKey, string> = {
  rate:      '#2D3A5C',
  inflation: '#D4614D',
  usd:       '#7B5EA7',
  risk:      '#1B8A7A',
};

export default function CardModal({ card, indicators, onClose, onPlay }: Props) {
  if (!card) return null;
  const def = CARD_MAP[card.defId];
  if (!def) return null;

  const ePnL = effectivePnL(card, indicators);
  const pnlChanged = ePnL !== card.currentPnL;
  const isPositive = ePnL >= 0;
  const deskColor = DESK_META[def.desk].color;
  const sensitivities = def.sensitivities;
  const sensKeys = sensitivities
    ? (Object.keys(sensitivities) as IndicatorKey[]).filter(k => sensitivities[k])
    : [];
  const indicatorChangeEntries = def.indicatorChanges
    ? (Object.entries(def.indicatorChanges) as [IndicatorKey, number][]).filter(([, v]) => v !== 0)
    : [];

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,26,46,0.55)',
          zIndex: 200,
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Centering wrapper — separate from animation so Framer doesn't clobber translate */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 201,
        width: '340px',
        maxWidth: '92vw',
      }}>
      <motion.div
        key="modal"
        initial={{ scale: 0.88, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.88, opacity: 0, y: 16 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-paper)',
          border: `2px solid ${deskColor}`,
          borderRadius: '6px',
          boxShadow: `0 24px 64px rgba(26,26,46,0.35)`,
        }}
      >
        {/* Art header */}
        <div style={{
          background: `linear-gradient(155deg, ${deskColor} 0%, ${deskColor}bb 100%)`,
          padding: '28px 20px 22px',
          textAlign: 'center',
          position: 'relative',
        }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: '#fff',
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              fontSize: '1rem',
              cursor: 'pointer',
              lineHeight: '26px',
              textAlign: 'center',
              padding: 0,
            }}
          >
            ×
          </button>

          <div style={{ fontSize: '3.6rem', lineHeight: 1, marginBottom: '10px' }}>{def.art}</div>
          <div style={{
            fontFamily: 'var(--font-headline)',
            fontSize: '1.35rem',
            fontWeight: 900,
            color: '#fff',
            letterSpacing: '-0.01em',
            marginBottom: '8px',
          }}>
            {def.name}
          </div>
          <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              def.type.toUpperCase(),
              (def.lane === 'any' ? 'ANY LANE' : def.lane.toUpperCase()),
              DESK_META[def.desk].name.toUpperCase(),
            ].map(label => (
              <span key={label} style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                letterSpacing: '0.08em',
                color: 'rgba(255,255,255,0.85)',
                background: 'rgba(0,0,0,0.25)',
                padding: '2px 8px',
                borderRadius: '2px',
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '18px 20px 22px' }}>

          {/* P&L block */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 14px',
            background: 'var(--bg-inset)',
            borderRadius: '3px',
            marginBottom: '16px',
          }}>
            <div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.48rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-caption)',
                marginBottom: '3px',
              }}>
                Effective P&L
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.8rem',
                fontWeight: 700,
                color: isPositive ? 'var(--pnl-positive)' : 'var(--pnl-negative)',
                lineHeight: 1,
              }}>
                {isPositive ? '+' : ''}{ePnL}
              </div>
            </div>
            {pnlChanged && (
              <div style={{ textAlign: 'right' }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.48rem',
                  color: 'var(--text-caption)',
                  marginBottom: '3px',
                }}>
                  Base P&L
                </div>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '1rem',
                  color: 'var(--text-caption)',
                  textDecoration: 'line-through',
                }}>
                  {def.basePnL > 0 ? '+' : ''}{def.basePnL}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: '0.82rem',
            color: 'var(--text-body)',
            lineHeight: 1.65,
            marginBottom: '16px',
          }}>
            {def.description}
          </div>

          {/* How it works */}
          {def.chain && (
            <div style={{
              borderLeft: `3px solid ${deskColor}`,
              paddingLeft: '12px',
              marginBottom: '16px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.48rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-caption)',
                marginBottom: '5px',
              }}>
                How It Works
              </div>
              <div style={{
                fontFamily: 'var(--font-body)',
                fontSize: '0.74rem',
                color: 'var(--text-body)',
                fontStyle: 'italic',
                lineHeight: 1.55,
              }}>
                {def.chain}
              </div>
            </div>
          )}

          {/* Indicator changes */}
          {indicatorChangeEntries.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.48rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-caption)',
                marginBottom: '7px',
              }}>
                When Played — Moves These Indicators
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {indicatorChangeEntries.map(([k, v]) => (
                  <span key={k} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    background: `${SENS_COLORS[k]}14`,
                    border: `1px solid ${SENS_COLORS[k]}40`,
                    color: SENS_COLORS[k],
                    borderRadius: '2px',
                  }}>
                    {INDICATOR_META[k].name} {v > 0 ? '+' : ''}{v}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* P&L Drivers */}
          {sensKeys.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.48rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-caption)',
                marginBottom: '7px',
              }}>
                P&L Drivers — how indicators affect this card
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {sensKeys.map(k => {
                  const val = sensitivities![k]!;
                  return (
                    <div key={k} style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      padding: '4px 10px',
                      background: `${SENS_COLORS[k]}14`,
                      border: `1px solid ${SENS_COLORS[k]}40`,
                      color: SENS_COLORS[k],
                      borderRadius: '2px',
                      lineHeight: 1.5,
                    }}>
                      {INDICATOR_META[k].icon} {INDICATOR_META[k].name} ↑1 → {val > 0 ? '+' : ''}{val} P&L · ↓1 → {val > 0 ? '-' : '+'}{Math.abs(val)} P&L
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Keywords */}
          {def.keywords.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.48rem',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--text-caption)',
                marginBottom: '7px',
              }}>
                Keywords
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {def.keywords.map(kw => (
                  <span key={kw} style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.58rem',
                    padding: '2px 8px',
                    background: 'var(--bg-inset)',
                    border: 'var(--border-light)',
                    color: 'var(--text-caption)',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Frozen */}
          {card.frozen && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6rem',
              color: 'var(--accent-salmon)',
              fontWeight: 700,
              marginBottom: '14px',
              padding: '6px 10px',
              background: 'rgba(212,97,77,0.08)',
              border: '1px solid rgba(212,97,77,0.3)',
              borderRadius: '2px',
            }}>
              SANCTIONED — {card.frozen} turn{card.frozen > 1 ? 's' : ''} remaining
            </div>
          )}

          {/* Play button */}
          {onPlay && (
            <button
              className="btn-primary"
              onClick={onPlay}
              style={{ width: '100%', padding: '11px', marginTop: '4px', fontSize: '0.85rem' }}
            >
              Select to Play
            </button>
          )}
        </div>
      </motion.div>
      </div>
    </AnimatePresence>
  );
}
