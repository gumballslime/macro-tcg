interface Props {
  difficulty: 'easy' | 'normal' | 'advanced';
  aiLevel: 'passive' | 'standard' | 'aggressive';
  onChangeDifficulty: (d: 'easy' | 'normal' | 'advanced') => void;
  onChangeAI: (a: 'passive' | 'standard' | 'aggressive') => void;
  onClose: () => void;
}

const DIFF_INFO = {
  easy: 'Rate + Risk only. No leverage, no carrying costs, no lagged effects.',
  normal: 'All 4 indicators. Leverage available. Regime effects on. No carrying costs.',
  advanced: 'Full mechanics: carrying costs, margin ratio, lagged effects, regime effects.',
};

const AI_INFO = {
  passive: 'AI plays randomly, never leverages, passes early.',
  standard: 'AI plays optimally, leverages when confident.',
  aggressive: 'AI always plays best card, leverages aggressively, rarely passes.',
};

export default function SettingsPanel({ difficulty, aiLevel, onChangeDifficulty, onChangeAI, onClose }: Props) {
  return (
    <>
      <div className="transmission-backdrop" onClick={onClose} />
      <div className="transmission-center">
        <div style={{
          width: '420px', maxWidth: '94vw',
          background: '#1A1A2E', border: '1px solid rgba(27,138,122,0.3)', borderRadius: '8px',
          boxShadow: '0 24px 64px rgba(26,26,46,0.5)', pointerEvents: 'auto', padding: '20px 24px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.1rem', color: '#fff', fontWeight: 700 }}>
              Settings
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
          </div>

          {/* Difficulty */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 700 }}>
              Difficulty
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {(['easy', 'normal', 'advanced'] as const).map(d => (
                <button key={d} onClick={() => onChangeDifficulty(d)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: '4px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  background: difficulty === d ? 'rgba(27,138,122,0.25)' : 'rgba(255,255,255,0.05)',
                  border: difficulty === d ? '1px solid rgba(27,138,122,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: difficulty === d ? '#1B8A7A' : 'rgba(255,255,255,0.4)',
                }}>
                  {d}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              {DIFF_INFO[difficulty]}
            </div>
          </div>

          {/* AI Level */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: '#C4851C', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 700 }}>
              AI Opponent
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
              {(['passive', 'standard', 'aggressive'] as const).map(a => (
                <button key={a} onClick={() => onChangeAI(a)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: '4px', cursor: 'pointer',
                  fontFamily: 'var(--font-mono)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                  background: aiLevel === a ? 'rgba(196,133,28,0.25)' : 'rgba(255,255,255,0.05)',
                  border: aiLevel === a ? '1px solid rgba(196,133,28,0.5)' : '1px solid rgba(255,255,255,0.1)',
                  color: aiLevel === a ? '#C4851C' : 'rgba(255,255,255,0.4)',
                }}>
                  {a}
                </button>
              ))}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
              {AI_INFO[aiLevel]}
            </div>
          </div>

          <button onClick={onClose} style={{
            width: '100%', padding: '8px', background: 'var(--accent-teal)', border: 'none',
            color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', fontWeight: 700,
            cursor: 'pointer', borderRadius: '4px',
          }}>
            Done
          </button>
        </div>
      </div>
    </>
  );
}
