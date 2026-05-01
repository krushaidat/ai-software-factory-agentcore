/**
 * Renders streaming agent_thinking text — accumulates `delta` strings (joined
 * by callers) and shows a blinking cursor while the stream is open.
 */

import type { CSSProperties } from 'react';
import { C } from '../../config/colors';

interface StreamingThoughtProps {
  /** Accumulated text from concatenated agent_thinking deltas. */
  text: string;
  /** Whether the stream is still open (cursor blinks). */
  streaming?: boolean;
  /** Cap height — default 200px with overflow scroll. */
  maxHeight?: number;
  style?: CSSProperties;
}

export function StreamingThought({
  text,
  streaming,
  maxHeight = 200,
  style,
}: StreamingThoughtProps) {
  return (
    <div
      style={{
        position: 'relative',
        background: 'rgba(255,255,255,0.02)',
        borderLeft: `2px solid ${C.dim}`,
        borderRadius: 4,
        padding: '6px 10px',
        marginTop: 4,
        marginLeft: 4,
        maxHeight,
        overflowY: 'auto',
        ...style,
      }}
    >
      <div
        style={{
          color: C.muted,
          fontSize: 11.5,
          fontStyle: 'italic',
          lineHeight: 1.55,
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        <span style={{ color: C.dim }}>&ldquo;</span>
        {text}
        <span style={{ color: C.dim }}>&rdquo;</span>
        {streaming && <BlinkingCursor />}
      </div>
    </div>
  );
}

function BlinkingCursor() {
  return (
    <>
      <style>{`
        @keyframes streamingThoughtCursor {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
      <span
        aria-hidden
        style={{
          display: 'inline-block',
          width: 7,
          height: 12,
          marginLeft: 3,
          background: C.accent,
          verticalAlign: '-2px',
          animation: 'streamingThoughtCursor 1s steps(1) infinite',
        }}
      />
    </>
  );
}
