import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TransmissionStep } from '../types';

interface Props {
  steps: TransmissionStep[];
  onComplete: () => void;
}

export default function TransmissionChain({ steps, onComplete }: Props) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (steps.length === 0) {
      onComplete();
      return;
    }

    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i > steps.length) {
        clearInterval(interval);
        setTimeout(onComplete, 600);
        return;
      }
      setVisibleCount(i);
    }, 300);

    return () => clearInterval(interval);
  }, [steps, onComplete]);

  if (steps.length === 0) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onComplete}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'var(--text-primary)',
        color: 'var(--bg-paper)',
        padding: 'var(--space-sm) var(--space-lg)',
        zIndex: 100,
        maxHeight: '180px',
        overflowY: 'auto',
        cursor: 'pointer',
      }}
    >
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-xs)',
      }}>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          color: 'var(--accent-salmon)',
        }}>
          Transmission Chain
        </span>
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.5rem',
          color: 'rgba(255,255,255,0.4)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
        }}>
          Click to skip
        </span>
      </div>
      {steps.slice(0, visibleCount).map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            padding: '2px 0',
            borderLeft: `2px solid ${
              step.type === 'indicator_change' ? 'var(--accent-teal)' :
              step.type === 'auto_trigger' ? 'var(--accent-salmon)' :
              step.type === 'direct_effect' ? '#C4851C' :
              'rgba(255,255,255,0.2)'
            }`,
            paddingLeft: 'var(--space-sm)',
            color: step.type === 'auto_trigger' ? 'var(--accent-salmon)' : 'var(--bg-surface)',
          }}
        >
          {step.indicator && step.from !== undefined && step.to !== undefined ? (
            <>
              {step.reason}
              <span style={{ opacity: 0.5 }}> ({step.indicator}: {step.from} → {step.to})</span>
            </>
          ) : (
            step.reason
          )}
        </motion.div>
      ))}
    </motion.div>
  );
}
