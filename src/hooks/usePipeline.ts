import { useState, useRef, useCallback } from 'react';
import type { ModeId } from '../types';
import { getStages } from '../data/stages';

export function usePipeline() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [stageTimings, setStageTimings] = useState<Record<string, number>>({});
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const stageStartRef = useRef<Record<string, number>>({});

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const startPipeline = useCallback(
    (mode: ModeId) => {
      clearTimers();
      const stages = getStages(mode);
      setCompleted([]);
      setRunning(true);
      setStageTimings({});
      stageStartRef.current = {};

      // Record start time for the first stage
      const firstId = stages[0]?.id;
      if (firstId) {
        stageStartRef.current[firstId] = Date.now();
      }
      setActiveId(firstId ?? null);

      let elapsed = 0;
      stages.forEach((stage, i) => {
        const delay = elapsed + stage.dur;
        const timer = setTimeout(() => {
          // Record timing for the completing stage
          const startTime = stageStartRef.current[stage.id];
          if (startTime) {
            setStageTimings((prev) => ({
              ...prev,
              [stage.id]: Date.now() - startTime,
            }));
          }

          setCompleted((prev) => [...prev, stage.id]);
          if (i < stages.length - 1) {
            const nextId = stages[i + 1].id;
            stageStartRef.current[nextId] = Date.now();
            setActiveId(nextId);
          } else {
            setActiveId(null);
            setRunning(false);
          }
        }, delay);
        timersRef.current.push(timer);
        elapsed = delay;
      });
    },
    [clearTimers],
  );

  const jumpToStage = useCallback(
    (stageId: string, mode: ModeId) => {
      clearTimers();
      setRunning(false);
      const stages = getStages(mode);
      const idx = stages.findIndex((s) => s.id === stageId);
      if (idx === -1) return;
      setActiveId(stageId);
      setCompleted(stages.slice(0, idx).map((s) => s.id));
      // Reconstruct approximate timings for jumped-over stages
      const timings: Record<string, number> = {};
      stages.slice(0, idx).forEach((s) => {
        timings[s.id] = s.dur;
      });
      setStageTimings(timings);
    },
    [clearTimers],
  );

  const stop = useCallback(() => {
    clearTimers();
    setRunning(false);
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setRunning(false);
    setActiveId(null);
    setCompleted([]);
    setStageTimings({});
    stageStartRef.current = {};
  }, [clearTimers]);

  const setActiveIdDirect = useCallback((id: string | null) => setActiveId(id), []);
  const setCompletedDirect = useCallback((ids: string[]) => setCompleted(ids), []);
  const setRunningDirect = useCallback((r: boolean) => setRunning(r), []);

  return { activeId, completed, running, stageTimings, startPipeline, jumpToStage, stop, reset, setActiveIdDirect, setCompletedDirect, setRunningDirect };
}
