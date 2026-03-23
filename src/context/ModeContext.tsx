import { createContext, useState, useCallback, type ReactNode } from 'react';
import type { ModeId } from '../types';

interface ModeContextValue {
  mode: ModeId;
  setMode: (m: ModeId) => void;
}

export const ModeContext = createContext<ModeContextValue>({
  mode: 'base',
  setMode: () => {},
});

export function ModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ModeId>(() => {
    const params = new URLSearchParams(window.location.search);
    const m = params.get('mode');
    if (m === 'base' || m === 'optA' || m === 'optB') return m;
    return 'base';
  });

  const setMode = useCallback((m: ModeId) => {
    setModeState(m);
    const url = new URL(window.location.href);
    url.searchParams.set('mode', m);
    window.history.replaceState({}, '', url.toString());
  }, []);

  return (
    <ModeContext.Provider value={{ mode, setMode }}>
      {children}
    </ModeContext.Provider>
  );
}
