import { useState, useRef, useCallback } from 'react';
import type { ModeId } from '../types';
import { getStages } from '../data/stages';

export function usePipeline() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

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
      setActiveId(stages[0]?.id ?? null);

      let elapsed = 0;
      stages.forEach((stage, i) => {
        const delay = elapsed + stage.dur;
        const timer = setTimeout(() => {
          setCompleted((prev) => [...prev, stage.id]);
          if (i < stages.length - 1) {
            setActiveId(stages[i + 1].id);
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
  }, [clearTimers]);

  return { activeId, completed, running, startPipeline, jumpToStage, stop, reset };
}
