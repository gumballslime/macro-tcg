import { StoryChapter } from '../story';

interface Props {
  chapter: StoryChapter;
  chapterIndex: number;
  totalChapters: number;
  capital: number;
}

export default function StoryMissionBar({ chapter, chapterIndex, totalChapters, capital }: Props) {
  return (
    <div style={{
      padding: '6px var(--space-md)',
      background: 'linear-gradient(90deg, rgba(45,58,92,0.15), transparent)',
      borderBottom: 'var(--border-light)',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: 'var(--accent-teal)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
          Ch.{chapterIndex + 1}/{totalChapters}
        </span>
        <span style={{ fontFamily: 'var(--font-headline)', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          {chapter.year} — {chapter.title}
        </span>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.55rem', color: '#C4851C' }}>
        {chapter.mission}
      </div>
    </div>
  );
}
