import { motion, AnimatePresence } from 'framer-motion';
import { TutorialStepDef, TUTORIAL_STEPS } from '../tutorial';

interface Props {
  step: TutorialStepDef;
  stepIdx: number;
  transmissionActive: boolean;
  onNext: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

const TOTAL = TUTORIAL_STEPS.length;

export default function TutorialOverlay({
  step,
  stepIdx,
  transmissionActive,
  onNext,
  onSkip,
  onComplete,
}: Props) {
  const isComplete = step.id === 'complete';
  const isInfoStep = !step.action;
  const isWaitingForAI = step.action === 'wait_ai';
  const canClickNext = isInfoStep && !transmissionActive;

  return (
    <motion.div
      key={step.id}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 28, stiffness: 320 }}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 150,
        background: 'var(--accent-navy)',
        color: 'var(--bg-paper)',
        borderTop: '3px solid var(--accent-teal)',
        padding: '14px 24px 16px',
        pointerEvents: transmissionActive ? 'none' : 'auto',
        opacity: transmissionActive ? 0.15 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      {/* Progress + skip row */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.48rem',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: 'var(--accent-teal)',
          }}>
            Tutorial · {stepIdx + 1} / {TOTAL}
          </div>
          <div style={{
            width: '80px',
            height: '3px',
            background: 'rgba(255,255,255,0.15)',
            borderRadius: '2px',
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${((stepIdx + 1) / TOTAL) * 100}%`,
              background: 'var(--accent-teal)',
              transition: 'width 0.3s ease',
            }} />
          </div>
        </div>

        {/* Skip */}
        {!isComplete && (
          <button
            onClick={onSkip}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.35)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.5rem',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              cursor: 'pointer',
              padding: '2px 0',
            }}
          >
            Skip tutorial ×
          </button>
        )}
      </div>

      {/* Title */}
      <div style={{
        fontFamily: 'var(--font-headline)',
        fontSize: '1rem',
        fontWeight: 700,
        color: '#fff',
        marginBottom: '6px',
      }}>
        {step.title}
      </div>

      {/* Body */}
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.8)',
        lineHeight: 1.6,
        marginBottom: '10px',
        maxHeight: '80px',
        overflowY: 'auto',
      }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {step.body.map((para, i) => (
              <p key={i} style={{ marginBottom: i < step.body.length - 1 ? '4px' : 0 }}>
                {para}
              </p>
            ))}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {isComplete ? (
          <button
            className="btn-primary"
            onClick={onComplete}
            style={{ fontSize: '0.8rem', padding: '8px 24px', background: 'var(--accent-teal)' }}
          >
            Start a real game →
          </button>
        ) : isWaitingForAI ? (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: 'var(--accent-teal)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            <span style={{ display: 'inline-block', animation: 'pulse 1.2s ease-in-out infinite' }}>◉</span>
            Watching the AI play…
          </div>
        ) : isInfoStep ? (
          <button
            onClick={onNext}
            disabled={!canClickNext}
            style={{
              background: canClickNext ? 'var(--accent-teal)' : 'rgba(255,255,255,0.1)',
              border: 'none',
              color: canClickNext ? '#fff' : 'rgba(255,255,255,0.3)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              padding: '6px 20px',
              cursor: canClickNext ? 'pointer' : 'not-allowed',
              letterSpacing: '0.05em',
              transition: 'all 0.15s ease',
              borderRadius: '2px',
            }}
          >
            Next →
          </button>
        ) : (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.58rem',
            color: '#C4851C',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}>
            ▶ Your move — follow the instructions above
          </div>
        )}
      </div>
    </motion.div>
  );
}
