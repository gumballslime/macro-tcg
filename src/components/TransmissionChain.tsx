import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransmissionStep, IndicatorKey, INDICATOR_META } from '../types';

interface Props {
  steps: TransmissionStep[];
  cardName?: string;
  onComplete: () => void;
  autoConfirm: boolean;
  onToggleAutoConfirm: () => void;
}

// ─── FAQ Data ────────────────────────────────────────────────

const FAQ_ENTRIES: { q: string; a: string }[] = [
  {
    q: 'Why did an indicator change on its own?',
    a: 'Auto-triggers model real macro causal chains. For example, when Inflation hits 4+, the central bank is forced to hike rates — just like in real life. These cascades can chain: a rate hike can crush risk appetite, which can trigger flight to safety.',
  },
  {
    q: 'What are the auto-trigger thresholds?',
    a: 'Inflation ≥ 7 → Rate +1. Inflation ≥ 9 → Rate +2 (hyperinflation). Rate ≥ 7 → Risk −1. Rate ≥ 9 → Risk −2 (over-tightening). Rate = 0 → Risk +1 (ZIRP). Rate ≤ 1 → Inflation +1 (easy money). USD ≥ 7 → EM positions −2. USD ≥ 9 → All positions −1 (dollar milkshake). Risk = 0 → Flight to Safety (Rates +3, Equities −3). Risk = 10 → Euphoria (Equities +3, Rates −2).',
  },
  {
    q: 'How do conditional orders work?',
    a: 'Conditional orders are set face-down. They auto-trigger when their condition is met — for example, "Margin Call" fires when Interest Rate ≥ 6, destroying opponent positions with negative rate sensitivity. You can engineer the macro environment to trigger your own orders. Your opponent can spend 2 capital to inspect and reveal a face-down order.',
  },
  {
    q: 'What are quickplay cards?',
    a: 'Quickplay cards (⚡) work like catalysts — they fire immediately and are discarded. But they can also be set face-down and activated later, even during your opponent\'s turn, to interrupt their strategy.',
  },
  {
    q: 'How do sensitivities affect P&L?',
    a: 'Each position has sensitivities to indicators. A Rate sensitivity of +2 means the card earns +2 extra P&L for every +1 the Rate indicator is above its starting value. Negative sensitivities work the same way — if Inflation rises and your card has Inflation −1, you lose P&L.',
  },
  {
    q: 'How does scoring work?',
    a: 'At the end of a quarter (both players pass), total board P&L is compared. Higher total P&L wins the quarter. Win 2 of 3 quarters to win the match. P&L = sum of all your positions\' effective P&L (base + sensitivity adjustments).',
  },
  {
    q: 'Why did my position get destroyed?',
    a: 'Positions can be destroyed by: combat (opponent attacked and their ATK exceeded your DEF), trap effects (e.g. Margin Call, Short Squeeze), or direct card effects. Check the transmission chain for the specific cause.',
  },
];

// ─── Step type styling ───────────────────────────────────────

function stepColor(type: TransmissionStep['type']): string {
  switch (type) {
    case 'indicator_change': return '#1B8A7A';
    case 'auto_trigger':     return '#D4614D';
    case 'direct_effect':    return '#C4851C';
    case 'liquidation':      return '#D4614D';
    case 'carrying_cost':    return '#C4851C';
    case 'position_effect':  return '#2D3A5C';
    default:                 return 'rgba(255,255,255,0.35)';
  }
}

function stepIcon(type: TransmissionStep['type']): string {
  switch (type) {
    case 'indicator_change': return '📊';
    case 'auto_trigger':     return '⚡';
    case 'direct_effect':    return '🎯';
    case 'liquidation':      return '💥';
    case 'carrying_cost':    return '💸';
    case 'position_effect':  return '📋';
    case 'chain_text':       return '→';
    default:                 return '•';
  }
}

function stepLabel(type: TransmissionStep['type']): string {
  switch (type) {
    case 'indicator_change': return 'INDICATOR';
    case 'auto_trigger':     return 'AUTO-TRIGGER';
    case 'direct_effect':    return 'EFFECT';
    case 'liquidation':      return 'MARGIN CALL';
    case 'carrying_cost':    return 'FUNDING COST';
    case 'position_effect':  return 'POSITION';
    case 'chain_text':       return 'CHAIN';
    default:                 return '';
  }
}

function indicatorIcon(key: IndicatorKey): string {
  return INDICATOR_META[key].icon;
}

// ─── Component ───────────────────────────────────────────────

export default function TransmissionChain({ steps, cardName, onComplete, autoConfirm, onToggleAutoConfirm }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [showFAQ, setShowFAQ] = useState(false);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [allRevealed, setAllRevealed] = useState(false);

  const STEP_INTERVAL = 600; // ms between each step reveal
  const AUTO_DISMISS_DELAY = 1200; // ms after last step before auto-dismiss

  useEffect(() => {
    if (steps.length === 0) {
      onComplete();
      return;
    }

    setVisibleCount(0);
    setAllRevealed(false);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i > steps.length) {
        clearInterval(interval);
        setAllRevealed(true);
        if (autoConfirm) {
          setTimeout(onComplete, AUTO_DISMISS_DELAY);
        }
        return;
      }
      setVisibleCount(i);
    }, STEP_INTERVAL);

    return () => clearInterval(interval);
  }, [steps, onComplete, autoConfirm]);

  const handleConfirm = useCallback(() => {
    if (showFAQ) {
      setShowFAQ(false);
      return;
    }
    onComplete();
  }, [showFAQ, onComplete]);

  if (steps.length === 0) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="transmission-backdrop" onClick={handleConfirm} />

      {/* Centered modal */}
      <div className="transmission-center">
      <div className="transmission-modal">
        {/* Header */}
        <div style={{
          padding: '14px 20px 12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: allRevealed ? '#1B8A7A' : '#D4614D',
              boxShadow: allRevealed ? '0 0 8px rgba(27,138,122,0.5)' : '0 0 8px rgba(212,97,77,0.5)',
              animation: allRevealed ? 'none' : 'pulse 1.2s ease-in-out infinite',
            }} />
            <div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                textTransform: 'uppercase',
                letterSpacing: '0.15em',
                color: '#D4614D',
                fontWeight: 700,
              }}>
                Transmission Chain
              </span>
              {cardName && (
                <div style={{
                  fontFamily: 'var(--font-headline)',
                  fontSize: '0.9rem',
                  color: '#fff',
                  fontWeight: 700,
                  marginTop: '2px',
                }}>
                  {cardName}
                </div>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.08em',
            }}>
              {visibleCount}/{steps.length}
            </span>
            {/* Progress bar */}
            <div style={{
              width: '60px', height: '3px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '2px', overflow: 'hidden',
            }}>
              <motion.div
                animate={{ width: `${(visibleCount / steps.length) * 100}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  height: '100%',
                  background: 'var(--accent-teal)',
                  borderRadius: '2px',
                }}
              />
            </div>
          </div>
        </div>

        {/* Steps area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          minHeight: '80px',
        }}>
          <AnimatePresence>
            {steps.slice(0, visibleCount).map((step, i) => {
              const color = stepColor(step.type);
              const icon = stepIcon(step.type);
              const label = stepLabel(step.type);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8, x: -8 }}
                  animate={{ opacity: 1, y: 0, x: 0 }}
                  transition={{ duration: 0.35, ease: 'easeOut' }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    marginBottom: '4px',
                    background: `${color}10`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: '0 4px 4px 0',
                  }}
                >
                  {/* Icon */}
                  <span style={{ fontSize: '0.85rem', lineHeight: 1, flexShrink: 0, marginTop: '1px' }}>
                    {icon}
                  </span>

                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type label */}
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.42rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.12em',
                      color,
                      fontWeight: 700,
                      marginBottom: '2px',
                    }}>
                      {label}
                    </div>

                    {/* Reason text */}
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.72rem',
                      color: 'rgba(255,255,255,0.85)',
                      lineHeight: 1.45,
                    }}>
                      {step.reason}
                    </div>

                    {/* Indicator delta */}
                    {step.indicator && step.from !== undefined && step.to !== undefined && (
                      <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        marginTop: '4px',
                        padding: '2px 8px',
                        background: `${color}18`,
                        borderRadius: '3px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.62rem',
                        color,
                        fontWeight: 700,
                      }}>
                        {indicatorIcon(step.indicator)}
                        <span>{INDICATOR_META[step.indicator].name}</span>
                        <span style={{ opacity: 0.6 }}>{step.from}</span>
                        <span>→</span>
                        <span>{step.to}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {/* Waiting indicator */}
          {!allRevealed && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.55rem',
              color: 'rgba(255,255,255,0.25)',
              padding: '6px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ animation: 'pulse 1.2s ease-in-out infinite' }}>◉</span>
              Resolving…
            </div>
          )}
        </div>

        {/* FAQ panel (expandable) */}
        <AnimatePresence>
          {showFAQ && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden', borderTop: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div style={{
                padding: '12px 16px',
                maxHeight: '260px',
                overflowY: 'auto',
                background: 'rgba(0,0,0,0.2)',
              }}>
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.5rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  color: 'var(--accent-teal)',
                  marginBottom: '8px',
                  fontWeight: 700,
                }}>
                  How it works
                </div>
                {FAQ_ENTRIES.map((faq, i) => (
                  <div key={i} style={{ marginBottom: '2px' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); setExpandedFAQ(expandedFAQ === i ? null : i); }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        background: expandedFAQ === i ? 'rgba(27,138,122,0.1)' : 'transparent',
                        border: 'none',
                        padding: '7px 10px',
                        cursor: 'pointer',
                        borderRadius: '3px',
                        fontFamily: 'var(--font-body)',
                        fontSize: '0.72rem',
                        color: 'rgba(255,255,255,0.8)',
                        lineHeight: 1.4,
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '6px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.55rem',
                        color: 'var(--accent-teal)',
                        flexShrink: 0,
                        marginTop: '2px',
                      }}>
                        {expandedFAQ === i ? '▾' : '▸'}
                      </span>
                      {faq.q}
                    </button>
                    <AnimatePresence>
                      {expandedFAQ === i && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{
                            padding: '6px 10px 10px 26px',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.68rem',
                            color: 'rgba(255,255,255,0.55)',
                            lineHeight: 1.55,
                          }}>
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer actions */}
        <div style={{
          padding: '10px 16px 12px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}>
          {/* Left: FAQ + auto-confirm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowFAQ(!showFAQ); }}
              style={{
                background: showFAQ ? 'rgba(27,138,122,0.15)' : 'transparent',
                border: `1px solid ${showFAQ ? 'rgba(27,138,122,0.4)' : 'rgba(255,255,255,0.15)'}`,
                color: showFAQ ? '#1B8A7A' : 'rgba(255,255,255,0.5)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                padding: '4px 10px',
                cursor: 'pointer',
                borderRadius: '3px',
                letterSpacing: '0.06em',
                transition: 'all 0.15s ease',
              }}
            >
              ? FAQ
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onToggleAutoConfirm(); }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.5rem',
                cursor: 'pointer',
                padding: '4px 2px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                letterSpacing: '0.06em',
              }}
            >
              <span style={{
                width: '28px', height: '14px',
                borderRadius: '7px',
                background: autoConfirm ? 'rgba(27,138,122,0.5)' : 'rgba(255,255,255,0.15)',
                position: 'relative',
                display: 'inline-block',
                transition: 'background 0.2s ease',
              }}>
                <span style={{
                  position: 'absolute',
                  top: '2px',
                  left: autoConfirm ? '14px' : '2px',
                  width: '10px', height: '10px',
                  borderRadius: '50%',
                  background: autoConfirm ? '#1B8A7A' : 'rgba(255,255,255,0.4)',
                  transition: 'left 0.2s ease, background 0.2s ease',
                }} />
              </span>
              AUTO
            </button>
          </div>

          {/* Right: confirm button */}
          {allRevealed && !autoConfirm ? (
            <button
              onClick={handleConfirm}
              style={{
                background: 'var(--accent-teal)',
                border: 'none',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '7px 20px',
                cursor: 'pointer',
                borderRadius: '3px',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                boxShadow: '0 2px 8px rgba(27,138,122,0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              Confirm →
            </button>
          ) : !allRevealed ? (
            <button
              onClick={handleConfirm}
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'rgba(255,255,255,0.4)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                padding: '5px 14px',
                cursor: 'pointer',
                borderRadius: '3px',
                letterSpacing: '0.06em',
              }}
            >
              Skip
            </button>
          ) : (
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              color: 'rgba(255,255,255,0.3)',
              letterSpacing: '0.08em',
            }}>
              Auto-dismissing…
            </span>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
