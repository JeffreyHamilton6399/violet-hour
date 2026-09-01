// Deep Azure syntax sample - comments are italic and recessive (#637777)
/**
 * Block doc comment. Exercises every token role the palette defines,
 * so you can eyeball the theme instead of trusting the contrast table.
 */
import React, { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

const MAX_RETRIES = 3;              // number / constant  -> peach
const ENDPOINT = 'https://api.example.com/v1/telemetry';
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;   // regex -> muted blue

export type Status = 'idle' | 'loading' | 'ready' | 'failed';

export interface PanelProps {           // interface -> tan
  title: string;
  count?: number;
  retries: number;
  onSelect(id: string, meta: Record<string, unknown>): void;
  children?: ReactNode;
}

function classify(status: Status): string {   // parameter -> italic
  switch (status) {
    case 'ready':
      return 'ok';
    case 'failed':
      return 'error';
    default:
      return `pending-${status}`;      // template punctuation -> teal
  }
}

export function Panel({ title, count = 0, retries, onSelect }: PanelProps) {
  const [status, setStatus] = useState<Status>('idle');
  const label = useMemo(() => `${title} (${count})`, [title, count]);

  const handle = useCallback(
    async (id: string) => {
      if (!SLUG_RE.test(id)) throw new Error(`bad id: ${id}`);
      setStatus('loading');
      try {
        const res = await fetch(`${ENDPOINT}/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, retries, ts: Date.now() }),
        });
        if (!res.ok) return setStatus('failed');
        onSelect(id, await res.json());
        setStatus('ready');
      } catch {
        setStatus('failed');
      }
    },
    [onSelect, retries]
  );

  return (
    <section className={classify(status)} data-count={count}>
      <h2 title={label}>{label}</h2>
      <Panel.Badge tone={status === 'failed' ? 'danger' : 'muted'} />
      <button disabled={status === 'loading'} onClick={() => handle('alpha-1')}>
        {status === 'loading' ? 'Working...' : 'Reload'}
      </button>
    </section>
  );
}

Panel.Badge = function Badge({ tone }: { tone: 'danger' | 'muted' }) {
  return <span className={`badge badge--${tone}`} />;
};

export default Panel;
