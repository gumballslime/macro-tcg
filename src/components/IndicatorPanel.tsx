import { motion } from 'framer-motion';
import { Indicators, IndicatorKey, INDICATOR_META } from '../types';

interface Props {
  indicators: Indicators;
  difficulty?: 'easy' | 'normal' | 'advanced';
}

const ALL_KEYS: IndicatorKey[] = ['rate', 'inflation', 'usd', 'risk'];
const EASY_KEYS: IndicatorKey[] = ['rate', 'risk'];
const SEGMENTS = 11; // 0-10 inclusive

export default function IndicatorPanel({ indicators, difficulty }: Props) {
  const KEYS = difficulty === 'easy' ? EASY_KEYS : ALL_KEYS;
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${KEYS.length}, 1fr)`,
      gap: 'var(--space-md)',
      padding: 'var(--space-md)',
      background: 'var(--bg-surface)',
      borderBottom: 'var(--border-medium)',
    }}>
      {KEYS.map(key => {
        const meta = INDICATOR_META[key];
        const value = indicators[key];
        return (
          <div key={key} style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-caption)',
              marginBottom: '4px',
            }}>
              {meta.name}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              marginBottom: '4px',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'var(--text-caption)',
                width: '56px',
                textAlign: 'right',
              }}>
                {meta.low}
              </span>

              <div style={{ display: 'flex', gap: '2px' }}>
                {Array.from({ length: SEGMENTS }).map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{
                      backgroundColor: i <= value
                        ? 'var(--indicator-bg)'
                        : 'rgba(26, 26, 46, 0.08)',
                    }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    style={{
                      width: '9px',
                      height: '6px',
                    }}
                  />
                ))}
              </div>

              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'var(--text-caption)',
                width: '56px',
                textAlign: 'left',
              }}>
                {meta.high}
              </span>
            </div>

            <motion.div
              key={value}
              initial={{ scale: 1.3, color: 'var(--accent-salmon)' }}
              animate={{ scale: 1, color: 'var(--text-primary)' }}
              transition={{ duration: 0.4 }}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.1rem',
                fontWeight: 700,
              }}
            >
              {value}
            </motion.div>
          </div>
        );
      })}
    </div>
  );
}
