import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import type { ModeId, PipelineRun } from '../types';

interface PipelineContextValue {
  run: PipelineRun;
  isLive: boolean;
  startLivePipeline: (code: string, mode: ModeId) => void;
  getStageData: (stageId: string) => any | null;
  resetRun: () => void;
}

const INITIAL_RUN: PipelineRun = {
  runId: '',
  status: 'idle',
  stages: {},
  code: '',
};

export const PipelineCtx = createContext<PipelineContextValue>({
  run: INITIAL_RUN,
  isLive: false,
  startLivePipeline: () => {},
  getStageData: () => null,
  resetRun: () => {},
});

// Generate a session ID
function getSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().slice(0, 8);
  return Math.random().toString(36).slice(2, 10);
}

const sessionId = getSessionId();

export function PipelineProvider({ children }: { children: ReactNode }) {
  const [run, setRun] = useState<PipelineRun>(INITIAL_RUN);
  const { send, subscribe, isLive, connected } = useWebSocket(sessionId);

  // Subscribe to pipeline events
  useEffect(() => {
    if (!isLive) return;

    const unsub1 = subscribe('pipeline_started', (data: any) => {
      setRun(prev => ({
        ...prev,
        runId: data.runId,
        status: 'running',
        startedAt: Date.now(),
      }));
    });

    const unsub2 = subscribe('stage_update', (data: any) => {
      setRun(prev => ({
        ...prev,
        stages: {
          ...prev.stages,
          [data.stageId]: {
            status: data.status,
            data: data.data || null,
            elapsed: data.elapsed,
            error: data.error,
          },
        },
      }));
    });

    const unsub3 = subscribe('pipeline_complete', () => {
      setRun(prev => ({ ...prev, status: 'completed' }));
    });

    const unsub4 = subscribe('pipeline_failed', () => {
      setRun(prev => ({ ...prev, status: 'failed' }));
    });

    return () => { unsub1(); unsub2(); unsub3(); unsub4(); };
  }, [isLive, subscribe]);

  const startLivePipeline = useCallback((code: string, mode: ModeId) => {
    setRun({ runId: '', status: 'running', stages: {}, code, startedAt: Date.now() });
    send({ action: 'pipeline_start', code, mode, sessionId });
  }, [send]);

  const getStageData = useCallback((stageId: string) => {
    const stage = run.stages[stageId];
    if (stage?.status === 'completed' && stage.data) return stage.data;
    return null;
  }, [run.stages]);

  const resetRun = useCallback(() => {
    setRun(INITIAL_RUN);
  }, []);

  return (
    <PipelineCtx.Provider value={{ run, isLive: isLive && connected, startLivePipeline, getStageData, resetRun }}>
      {children}
    </PipelineCtx.Provider>
  );
}
