/**
 * useEventPlayback — turns a static list of `PlayableEvent` (offset-based) into
 * a live, time-progressing stream of `AgentEvent`s.
 *
 * Two modes:
 *   - `'frozen'`  : emit all events at once (for the "View past session" experience)
 *   - `'play'`    : start at offset 0 and emit each event when the wall clock
 *                   passes its `offsetMs * 1/speed` mark.
 *
 * Re-runs from scratch whenever `sessionId` or `mode` changes.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AgentEvent, AgentName } from '../types/agents';
import type { PlayableEvent } from '../data/sampleSessions';

export type PlaybackMode = 'frozen' | 'play';

export interface UseEventPlaybackOptions {
  /** Stable id keying playback. Changing this restarts. */
  sessionId: string;
  /** Source events with relative offsets. */
  source: PlayableEvent[];
  /** Pre-built frozen variant (with absolute timestamps). Used in `frozen` mode. */
  frozen: AgentEvent[];
  /** Run mode. */
  mode: PlaybackMode;
  /** Playback speed multiplier (1.0 = real time, 2.0 = 2x faster). Default 1. */
  speed?: number;
}

export interface UseEventPlaybackResult {
  events: AgentEvent[];
  /** True while the playback is still emitting events. Always false in `frozen` mode. */
  playing: boolean;
  /** Current "wall-clock" offset in ms since session start (matches latest emitted event). */
  elapsedMs: number;
  /** Most recently invoked-but-not-completed agent (or null). */
  currentAgent: AgentName | null;
}

/**
 * Convert a PlayableEvent + a base timestamp into an AgentEvent.
 */
function materialize(p: PlayableEvent, baseMs: number, sessionId: string, runId: string): AgentEvent {
  return {
    type: p.type,
    timestamp: new Date(baseMs + p.offsetMs).toISOString(),
    sessionId,
    runId,
    agentName: p.agentName,
    spanId: p.spanId,
    parentSpanId: p.parentSpanId,
    payload: p.payload,
  } as AgentEvent;
}

/**
 * Compute "current agent" from emitted events: most recent agent_invoked
 * whose matching agent_completed has NOT been emitted yet.
 */
function computeCurrentAgent(events: AgentEvent[]): AgentName | null {
  const completedAt: Record<string, number> = {};
  events.forEach((e, i) => {
    if (e.type === 'agent_completed') completedAt[e.spanId] = i;
  });
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'agent_invoked' && completedAt[e.spanId] == null) {
      return e.agentName;
    }
  }
  return null;
}

export function useEventPlayback(opts: UseEventPlaybackOptions): UseEventPlaybackResult {
  const { sessionId, source, frozen, mode, speed = 1 } = opts;
  const [emitted, setEmitted] = useState<AgentEvent[]>([]);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(mode === 'play');

  // Stable run id per (sessionId, mode) cycle
  const runIdRef = useRef<string>(`${sessionId}-${Date.now()}`);

  useEffect(() => {
    runIdRef.current = `${sessionId}-${Date.now()}`;

    if (mode === 'frozen') {
      setEmitted(frozen);
      setElapsedMs(
        frozen.length > 0
          ? Math.max(...frozen.map((e) => Date.parse(e.timestamp) || 0)) -
              (Date.parse(frozen[0]?.timestamp || '') || 0)
          : 0,
      );
      setPlaying(false);
      return;
    }

    // --- play mode ---
    setEmitted([]);
    setElapsedMs(0);
    setPlaying(true);

    if (source.length === 0) {
      setPlaying(false);
      return;
    }

    const baseMs = Date.now();
    const sortedByOffset = [...source].sort((a, b) => a.offsetMs - b.offsetMs);
    const totalMs = sortedByOffset[sortedByOffset.length - 1].offsetMs;

    let cancelled = false;
    let nextIdx = 0;
    let raf = 0;

    const tick = () => {
      if (cancelled) return;
      const now = Date.now();
      const wall = (now - baseMs) * speed; // playback speed scaled
      // Emit all events whose offset has been reached
      let advanced = false;
      while (nextIdx < sortedByOffset.length && sortedByOffset[nextIdx].offsetMs <= wall) {
        const next = sortedByOffset[nextIdx];
        nextIdx++;
        advanced = true;
        const ev = materialize(next, baseMs, sessionId, runIdRef.current);
        setEmitted((prev) => [...prev, ev]);
      }
      if (advanced) setElapsedMs(Math.min(wall, totalMs));

      if (nextIdx < sortedByOffset.length) {
        raf = window.setTimeout(tick, 60); // ~16fps emission cadence
      } else {
        setPlaying(false);
        setElapsedMs(totalMs);
      }
    };

    raf = window.setTimeout(tick, 16);

    return () => {
      cancelled = true;
      window.clearTimeout(raf);
    };
    // We intentionally do NOT depend on `source`/`frozen` reference identity —
    // sessionId changing is the only legitimate restart trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, mode, speed]);

  const currentAgent = useMemo(() => computeCurrentAgent(emitted), [emitted]);

  return { events: emitted, playing, elapsedMs, currentAgent };
}
