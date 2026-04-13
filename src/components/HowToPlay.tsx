interface Props {
  onStart: () => void;
}

export default function HowToPlay({ onStart }: Props) {
  return (
    <div style={{ maxWidth: '660px', margin: '0 auto', padding: '0 var(--space-md) var(--space-xl)' }}>

      <div style={{ textAlign: 'center', marginBottom: 'var(--space-xl)' }}>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontStyle: 'italic',
          color: 'var(--text-body)',
          fontSize: '1rem',
          lineHeight: 1.7,
          marginBottom: 'var(--space-lg)',
        }}>
          Cards move indicators. Indicators move positions. That's how you learn macro.
        </p>
        <div style={{ display: 'flex', gap: 'var(--space-md)', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={onStart} style={{ fontSize: '1rem', padding: '10px 32px' }}>
            Player vs AI
          </button>
          <button className="btn-secondary" disabled style={{ opacity: 0.4 }}>
            Sandbox (Soon)
          </button>
        </div>
      </div>

      <Rule label="The Four Indicators" color="#2D3A5C">
        Every card you play can move one or more of these four macro indicators. Each runs
        from <strong>0 to 5</strong>. Your cards' P&L changes based on where these land.
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
          {[
            { icon: '📊', name: 'Interest Rate', desc: '0 = ZIRP · 5 = Hawkish Fed', color: '#2D3A5C' },
            { icon: '🔥', name: 'Inflation', desc: '0 = Deflation · 5 = Overheating', color: '#D4614D' },
            { icon: '💵', name: 'USD Index', desc: '0 = Weak $ · 5 = Strong $', color: '#7B5EA7' },
            { icon: '📈', name: 'Risk Appetite', desc: '0 = Fear · 5 = Greed', color: '#1B8A7A' },
          ].map(ind => (
            <div key={ind.name} style={{
              padding: '8px 10px',
              background: `${ind.color}0c`,
              border: `1px solid ${ind.color}30`,
              borderLeft: `3px solid ${ind.color}`,
              borderRadius: '2px',
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: '3px' }}>{ind.icon}</div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6rem',
                fontWeight: 700,
                color: ind.color,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '2px',
              }}>
                {ind.name}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.55rem',
                color: 'var(--text-caption)',
              }}>
                {ind.desc}
              </div>
            </div>
          ))}
        </div>
      </Rule>

      <Rule label="Two Types of Cards" color="#1B8A7A">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div style={{
            padding: '10px',
            background: 'rgba(27,138,122,0.06)',
            border: '1px solid rgba(27,138,122,0.25)',
            borderRadius: '2px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              fontWeight: 700,
              color: '#1B8A7A',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '5px',
            }}>
              Position
            </div>
            <p style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
              Stays on the board. Earns P&L each turn based on its <em>sensitivities</em> —
              how much each indicator move is worth to it.
            </p>
          </div>
          <div style={{
            padding: '10px',
            background: 'rgba(212,97,77,0.06)',
            border: '1px solid rgba(212,97,77,0.25)',
            borderRadius: '2px',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.58rem',
              fontWeight: 700,
              color: '#D4614D',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '5px',
            }}>
              Catalyst
            </div>
            <p style={{ fontSize: '0.75rem', lineHeight: 1.5 }}>
              Fires and is discarded. Moves indicators immediately — which then ripple
              through every position on the board.
            </p>
          </div>
        </div>
      </Rule>

      <Rule label="Sensitivities" color="#7B5EA7">
        Each position card has sensitivities to the indicators. A sensitivity of <strong>Rate +3</strong> means
        the card earns <strong>+3 extra P&L</strong> for every +1 move in the Interest Rate above
        its starting value (2). Negative sensitivities lose P&L when that indicator rises.
        <br /><br />
        Example: <em>Jerome Powell</em> has Rate +3, Risk −1. If the Rate rises to 4, he earns
        +6 extra P&L. If Risk falls to 1, he loses −2.
      </Rule>

      <Rule label="The Transmission Chain" color="#C4851C">
        After every card play, a chain of effects fires in sequence — shown at the bottom of
        the screen. Indicators can auto-trigger each other:
        <ul style={{ marginTop: '8px', paddingLeft: '20px', lineHeight: 1.8, fontSize: '0.78rem' }}>
          <li>Inflation ≥ 4 → central bank is forced to hike rates</li>
          <li>Rate ≥ 4 → tight money kills risk appetite</li>
          <li>Rate = 0 → ZIRP pushes investors into risk assets</li>
          <li>USD ≥ 4 → strong dollar crushes EM positions (−2 P&L)</li>
          <li>Risk = 0 → flight to safety: Rates +2, Equities −2</li>
          <li>Risk = 5 → euphoria: Equities +2, Rates −1</li>
        </ul>
        <em style={{ fontSize: '0.72rem', color: 'var(--text-caption)' }}>Click the chain overlay to dismiss it early.</em>
      </Rule>

      <Rule label="How to Win" color="#D4614D">
        Win <strong>2 of 3 quarters</strong>. A quarter ends when both players pass. The player with
        higher total P&L on their board wins the quarter. Boards clear between quarters —
        but indicators carry over. Plan around the macro regime you're building.
      </Rule>

      <Rule label="Playing a Card" color="#2D3A5C">
        <ol style={{ paddingLeft: '20px', lineHeight: 1.9, fontSize: '0.78rem' }}>
          <li>Click a card in your hand to view it and select it to play.</li>
          <li>A highlighted lane appears on the board — click it to deploy.</li>
          <li>Catalyst cards go to any lane and fire immediately.</li>
          <li>Position cards go to their home lane (or any lane if unspecified).</li>
          <li>Pass when you're happy with your board or want to conserve cards.</li>
        </ol>
      </Rule>

    </div>
  );
}

function Rule({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 'var(--space-lg)' }}>
      <div style={{
        fontFamily: 'var(--font-headline)',
        fontSize: '1rem',
        fontWeight: 700,
        color: 'var(--text-primary)',
        borderBottom: `2px solid ${color}`,
        paddingBottom: '5px',
        marginBottom: '10px',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: '0.8rem',
        color: 'var(--text-body)',
        lineHeight: 1.65,
      }}>
        {children}
      </div>
    </div>
  );
}
