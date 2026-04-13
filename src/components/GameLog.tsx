import { useEffect, useRef } from 'react';

interface Props {
  entries: string[];
}

export default function GameLog({ entries }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries.length]);

  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: '0.68rem',
      lineHeight: 1.7,
      color: 'var(--text-caption)',
      maxHeight: '160px',
      overflowY: 'auto',
      padding: 'var(--space-sm)',
      background: 'var(--bg-inset)',
      border: 'var(--border-light)',
    }}>
      {entries.map((entry, i) => (
        <p key={i} style={{
          padding: '1px 0',
          borderBottom: '1px solid rgba(26, 26, 46, 0.04)',
        }}>
          {entry}
        </p>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
