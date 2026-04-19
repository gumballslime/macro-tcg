import { StoryChapter } from '../story';

interface Props {
  chapter: StoryChapter;
  chapterIndex: number;
  totalChapters: number;
  won: boolean;
  playerScore: number;
  aiScore: number;
  capitalBefore: number;
  capitalAfter: number;
  onContinue: () => void;
}

export default function StoryResult({ chapter, chapterIndex, totalChapters, won, playerScore, aiScore, capitalBefore, capitalAfter, onContinue }: Props) {
  const capitalDelta = capitalAfter - capitalBefore;

  return (
    <div className="transmission-center" style={{ zIndex: 200 }}>
      <div style={{
        width: '480px', maxWidth: '94vw',
        background: '#1A1A2E', border: `1px solid ${won ? 'rgba(27,138,122,0.4)' : 'rgba(212,97,77,0.4)'}`,
        borderRadius: '8px', boxShadow: '0 32px 80px rgba(26,26,46,0.6)', pointerEvents: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px', textAlign: 'center',
          background: won ? 'linear-gradient(160deg, rgba(27,138,122,0.15), transparent)' : 'linear-gradient(160deg, rgba(212,97,77,0.15), transparent)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px' }}>
            Chapter {chapterIndex + 1}: {chapter.title}
          </div>
          <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.8rem', color: won ? '#1B8A7A' : '#D4614D', fontWeight: 700 }}>
            {won ? 'Victory' : 'Defeat'}
          </div>
        </div>

        {/* Scores */}
        <div style={{ padding: '16px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>You</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: playerScore >= 0 ? '#1B8A7A' : '#D4614D' }}>
              {playerScore >= 0 ? '+' : ''}{playerScore}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>AI</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.6rem', fontWeight: 700, color: aiScore >= 0 ? '#1B8A7A' : '#D4614D' }}>
              {aiScore >= 0 ? '+' : ''}{aiScore}
            </div>
          </div>
        </div>

        {/* Capital change */}
        <div style={{ padding: '12px 28px', borderTop: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Capital
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: capitalDelta >= 0 ? '#1B8A7A' : '#D4614D', fontWeight: 700 }}>
            {capitalBefore} → {capitalAfter} ({capitalDelta >= 0 ? '+' : ''}{capitalDelta})
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '12px 28px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', color: 'var(--text-caption)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>
            Progress
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {Array.from({ length: totalChapters }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '6px', borderRadius: '3px',
                background: i <= chapterIndex ? 'var(--accent-teal)' : 'rgba(255,255,255,0.1)',
              }} />
            ))}
          </div>
        </div>

        {/* Continue */}
        <div style={{ padding: '16px 28px 24px' }}>
          <button
            onClick={onContinue}
            style={{
              width: '100%', padding: '10px', background: 'var(--accent-teal)', border: 'none',
              color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', borderRadius: '4px', letterSpacing: '0.05em',
            }}
          >
            {chapterIndex + 1 >= totalChapters ? 'See Final Results' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
