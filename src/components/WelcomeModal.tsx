import { motion } from 'framer-motion';

interface Props {
  onQuickPlay: () => void;
  onStory: () => void;
  onTutorial: (level: 'beginner' | 'intermediate' | 'advanced') => void;
  onClose: () => void;
}

export default function WelcomeModal({ onQuickPlay, onStory, onTutorial, onClose }: Props) {
  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(26,26,46,0.7)',
          zIndex: 300,
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Centering wrapper */}
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 301,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        style={{
          width: '480px',
          maxWidth: '92vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-paper)',
          border: '2px solid var(--text-primary)',
          borderRadius: '4px',
          padding: '32px 28px 28px',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(26,26,46,0.4)',
          position: 'relative',
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            background: 'none', border: 'none', color: 'var(--text-caption)',
            fontSize: '1.2rem', cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Logo */}
        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '2.2rem',
          fontWeight: 900,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}>
          MACRO
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          fontSize: '0.8rem',
          color: 'var(--text-caption)',
          marginBottom: '24px',
        }}>
          Learn macro through trading card battles
        </div>

        {/* Play modes */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <button
            className="btn-salmon"
            onClick={onStory}
            style={{ flex: 1, padding: '14px 8px', fontSize: '0.85rem' }}
          >
            Story Mode
            <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', opacity: 0.7, marginTop: '2px' }}>Financial history campaign</div>
          </button>
          <button
            className="btn-primary"
            onClick={onQuickPlay}
            style={{ flex: 1, padding: '14px 8px', fontSize: '0.85rem' }}
          >
            Quick Play
            <div style={{ fontSize: '0.55rem', fontFamily: 'var(--font-mono)', opacity: 0.7, marginTop: '2px' }}>Single match vs AI</div>
          </button>
        </div>

        {/* Tutorial section */}
        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '0.9rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '4px',
        }}>
          New here? Pick your level:
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: '0.7rem',
          color: 'var(--text-caption)',
          marginBottom: '12px',
        }}>
          The tutorial adjusts complexity to your experience
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => onTutorial('beginner')}
            style={{
              width: '100%', padding: '12px 16px', textAlign: 'left',
              background: 'var(--bg-surface)', border: 'var(--border-medium)',
              borderRadius: '4px', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Beginner — New to finance
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-caption)', marginTop: '2px' }}>
                  2 indicators. No leverage or costs. Just learn how cards move markets.
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--accent-teal)', fontWeight: 700 }}>EASY</span>
            </div>
          </button>

          <button
            onClick={() => onTutorial('intermediate')}
            style={{
              width: '100%', padding: '12px 16px', textAlign: 'left',
              background: 'var(--bg-surface)', border: 'var(--border-medium)',
              borderRadius: '4px', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Intermediate — Know the basics
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-caption)', marginTop: '2px' }}>
                  All 4 indicators. Leverage, funding costs, margin calls, regime effects.
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#C4851C', fontWeight: 700 }}>NORMAL</span>
            </div>
          </button>

          <button
            onClick={() => onTutorial('advanced')}
            style={{
              width: '100%', padding: '12px 16px', textAlign: 'left',
              background: 'var(--bg-surface)', border: 'var(--border-medium)',
              borderRadius: '4px', cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-headline)', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Advanced — Finance professional
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-caption)', marginTop: '2px' }}>
                  Full: FX hedging, credit spreads, policy lags, dynamic margin. The real thing.
                </div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: '#D4614D', fontWeight: 700 }}>ADVANCED</span>
            </div>
          </button>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.45rem',
          color: 'var(--text-caption)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop: '16px',
        }}>
          Cards move indicators · Indicators move P&L · You learn macro
        </div>
      </motion.div>
      </div>
    </>
  );
}
