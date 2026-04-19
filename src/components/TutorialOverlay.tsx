import { motion, AnimatePresence } from 'framer-motion';
import { TutorialStepDef } from '../tutorial';

interface Props {
  step: TutorialStepDef;
  stepIdx: number;
  totalSteps: number;
  transmissionActive: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onComplete: () => void;
}

export default function TutorialOverlay({
  step,
  stepIdx,
  totalSteps,
  transmissionActive,
  onNext,
  onPrev,
  onSkip,
  onComplete,
}: Props) {
  const TOTAL = totalSteps;
  const isComplete = step.id === 'complete';
  const isInfoStep = !step.action;
  const isWaitingForAI = step.action === 'wait_ai';
  const canClickNext = isInfoStep && !transmissionActive;
  const canGoBack = stepIdx > 0 && !transmissionActive;

  return (
    <div
      className="tutorial-center"
      style={{
        pointerEvents: transmissionActive ? 'none' : undefined,
        opacity: transmissionActive ? 0.15 : 1,
        transition: 'opacity 0.2s ease',
      }}
    >
      <div className="tutorial-modal">
        {/* Progress + skip row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
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
          fontSize: '1.25rem',
          fontWeight: 700,
          color: '#fff',
          marginBottom: '10px',
        }}>
          {step.title}
        </div>

        {/* Body */}
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.95rem',
          color: 'rgba(255,255,255,0.85)',
          lineHeight: 1.7,
          marginBottom: '14px',
        }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Left: back button */}
          <div>
            {canGoBack && (
              <button
                onClick={onPrev}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  padding: '7px 18px',
                  cursor: 'pointer',
                  letterSpacing: '0.05em',
                  borderRadius: '3px',
                  transition: 'all 0.15s ease',
                }}
              >
                ← Back
              </button>
            )}
          </div>

          {/* Right: next / action */}
          <div>
            {isComplete ? (
              <button
                className="btn-primary"
                onClick={onComplete}
                style={{ fontSize: '0.85rem', padding: '8px 24px', background: 'var(--accent-teal)' }}
              >
                Start a real game →
              </button>
            ) : isWaitingForAI ? (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
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
                  fontSize: '0.85rem',
                  padding: '8px 24px',
                  cursor: canClickNext ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.05em',
                  transition: 'all 0.15s ease',
                  borderRadius: '3px',
                }}
              >
                Next →
              </button>
            ) : (
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.65rem',
                color: '#C4851C',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
              }}>
                ▶ Your move
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
