import { StoryChapter } from '../story';

interface Props {
  chapter: StoryChapter;
  chapterIndex: number;
  totalChapters: number;
  isEpilogue?: boolean;
  onContinue: () => void;
}

export default function StoryNarrative({ chapter, chapterIndex, totalChapters, isEpilogue, onContinue }: Props) {
  const paragraphs = isEpilogue ? chapter.epilogue : chapter.narrative;

  return (
    <div className="transmission-center" style={{ zIndex: 200 }}>
      <div style={{
        width: '560px', maxWidth: '94vw', maxHeight: '85vh', overflowY: 'auto',
        background: '#1A1A2E', border: '1px solid rgba(27,138,122,0.3)', borderRadius: '8px',
        boxShadow: '0 32px 80px rgba(26,26,46,0.6)', pointerEvents: 'auto',
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          background: 'linear-gradient(160deg, #2D3A5C 0%, #1A1A2E 100%)',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '4px' }}>
            {isEpilogue ? 'Epilogue' : `Chapter ${chapterIndex + 1} of ${totalChapters}`}
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', color: 'rgba(255,255,255,0.15)', fontWeight: 700, marginBottom: '4px' }}>
            {chapter.year}
          </div>
          <div style={{ fontFamily: 'var(--font-headline)', fontSize: '1.5rem', color: '#fff', fontWeight: 700, marginBottom: '4px' }}>
            {chapter.title}
          </div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            {chapter.subtitle}
          </div>
        </div>

        {/* Narrative */}
        <div style={{ padding: '20px 28px' }}>
          {paragraphs.map((p, i) => (
            <p key={i} style={{
              fontFamily: 'var(--font-body)', fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)',
              lineHeight: 1.7, marginBottom: i < paragraphs.length - 1 ? '12px' : 0,
            }}>
              {p}
            </p>
          ))}
        </div>

        {/* Regime Briefing (only on intro, not epilogue) */}
        {!isEpilogue && chapter.regimeBriefing && (
          <div style={{
            margin: '0 28px 16px', padding: '14px 16px',
            background: 'rgba(27,138,122,0.08)', border: '1px solid rgba(27,138,122,0.2)',
            borderRadius: '4px',
          }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '8px', fontWeight: 700 }}>
              Regime Briefing
            </div>
            {chapter.regimeBriefing.map((line, i) => (
              <div key={i} style={{
                fontFamily: line.startsWith('💡') ? 'var(--font-body)' : 'var(--font-mono)',
                fontSize: line.startsWith('💡') ? '0.8rem' : '0.7rem',
                color: line.startsWith('💡') ? 'rgba(196,133,28,0.9)' : 'rgba(255,255,255,0.65)',
                lineHeight: 1.6,
                marginBottom: line === '' ? '4px' : '2px',
                fontWeight: line.startsWith('💡') ? 600 : 400,
              }}>
                {line}
              </div>
            ))}
          </div>
        )}

        {/* Mission + Button */}
        <div style={{ padding: '16px 28px 24px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {!isEpilogue && (
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#C4851C',
              textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px',
              padding: '6px 10px', background: 'rgba(196,133,28,0.1)', borderRadius: '3px',
              border: '1px solid rgba(196,133,28,0.2)',
            }}>
              Mission: {chapter.mission}
            </div>
          )}
          <button
            onClick={onContinue}
            style={{
              width: '100%', padding: '10px', background: 'var(--accent-teal)', border: 'none',
              color: '#fff', fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', borderRadius: '4px', letterSpacing: '0.05em',
            }}
          >
            {isEpilogue ? 'Continue' : 'Begin Chapter'}
          </button>
        </div>
      </div>
    </div>
  );
}
