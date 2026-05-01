import { useMemo } from 'react';
import type { AgentEvent, MemoryEntry } from '../types/agents';

interface UseMemoryEventsResult {
  memoryReads: MemoryEntry[];
  memoryWrites: MemoryEntry[];
  consolidationCount: number;
  userPrefs: MemoryEntry[];
}

function toEntry(ev: AgentEvent): MemoryEntry {
  const p = ev.payload || {};
  return {
    strategy: typeof p.strategy === 'string' ? p.strategy : 'UNKNOWN',
    query: typeof p.query === 'string' ? p.query : undefined,
    content: typeof p.content === 'string' ? p.content : undefined,
    matches: Array.isArray(p.matches) ? p.matches : undefined,
    namespace: typeof p.namespace === 'string' ? p.namespace : undefined,
  };
}

/** Filter memory_read / memory_write events out of the agent stream. */
export function useMemoryEvents(events: AgentEvent[]): UseMemoryEventsResult {
  return useMemo(() => {
    const memoryReads: MemoryEntry[] = [];
    const memoryWrites: MemoryEntry[] = [];
    const userPrefs: MemoryEntry[] = [];

    for (const ev of events) {
      if (ev.type === 'memory_read') {
        memoryReads.push(toEntry(ev));
      } else if (ev.type === 'memory_write') {
        const entry = toEntry(ev);
        memoryWrites.push(entry);
        if (entry.strategy === 'USER_PREFERENCE') {
          userPrefs.push(entry);
        }
      }
    }

    return {
      memoryReads,
      memoryWrites,
      consolidationCount: memoryWrites.length,
      userPrefs,
    };
  }, [events]);
}
