import { motion } from 'framer-motion';

interface Props {
  onYes: () => void;
  onNo: () => void;
}

export default function WelcomeModal({ onYes, onNo }: Props) {
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

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 300 }}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 301,
          width: '420px',
          maxWidth: '92vw',
          background: 'var(--bg-paper)',
          border: '2px solid var(--text-primary)',
          borderRadius: '4px',
          padding: '36px 32px 32px',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(26,26,46,0.4)',
        }}
      >
        {/* Logo mark */}
        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '2.2rem',
          fontWeight: 900,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
          marginBottom: '8px',
        }}>
          MACRO
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          fontSize: '0.8rem',
          color: 'var(--text-caption)',
          marginBottom: '28px',
        }}>
          The Macro Trading Card Game
        </div>

        <div style={{
          fontFamily: 'var(--font-headline)',
          fontSize: '1.2rem',
          fontWeight: 700,
          color: 'var(--text-primary)',
          marginBottom: '24px',
        }}>
          Have you played before?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            className="btn-primary"
            onClick={onYes}
            style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
          >
            Yes — take me to the game
          </button>
          <button
            className="btn-secondary"
            onClick={onNo}
            style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
          >
            No — walk me through it
          </button>
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.5rem',
          color: 'var(--text-caption)',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginTop: '20px',
        }}>
          Cards move indicators · Indicators move positions
        </div>
      </motion.div>
    </>
  );
}
