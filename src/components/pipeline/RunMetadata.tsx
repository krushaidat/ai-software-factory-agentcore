import { useState, useEffect, useRef } from 'react';
import { C } from '../../config/colors';

interface RunMetadataProps {
  running: boolean;
  completed: boolean;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}m ${sec.toString().padStart(2, '0')}s`;
}

export function RunMetadata({ running, completed }: RunMetadataProps) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (running && !startRef.current) {
      startRef.current = Date.now();
    }

    if (running) {
      const tick = () => {
        if (startRef.current) {
          setElapsed(Date.now() - startRef.current);
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
    }
    // If completed (not running but was running), freeze the elapsed
  }, [running]);

  // Reset on new run
  useEffect(() => {
    if (running) {
      startRef.current = Date.now();
      setElapsed(0);
    }
  }, [running]);

  const mono: React.CSSProperties = {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 11,
    color: C.muted,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    color: C.dim,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    fontWeight: 600,
    marginBottom: 2,
  };

  const statusColor = completed ? C.ok : running ? C.accent : C.dim;
  const statusText = completed ? 'COMPLETED' : running ? 'RUNNING' : 'IDLE';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 24,
        padding: '10px 16px',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        marginBottom: 8,
      }}
    >
      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColor,
            boxShadow: running ? `0 0 6px ${C.accent}` : 'none',
            animation: running ? 'pulse 1.5s infinite' : 'none',
          }}
        />
        <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusText}</span>
      </div>

      {/* Run ID */}
      <div>
        <div style={labelStyle}>Run ID</div>
        <div style={mono}>RUN-2025-1847-047</div>
      </div>

      {/* Started */}
      <div>
        <div style={labelStyle}>Started</div>
        <div style={mono}>March 23, 2026 14:32:01 UTC</div>
      </div>

      {/* Duration */}
      <div>
        <div style={labelStyle}>Duration</div>
        <div style={{ ...mono, color: running ? C.accent : C.muted }}>
          {formatElapsed(elapsed)}
        </div>
      </div>

      {/* Triggered by */}
      <div style={{ marginLeft: 'auto' }}>
        <div style={labelStyle}>Triggered by</div>
        <div style={mono}>
          PR #1847 merge to <span style={{ color: C.accent }}>integration/v3.4.2</span>
        </div>
      </div>
    </div>
  );
}
