import { useState, useEffect, useRef, useCallback } from 'react';
import { WSClient } from '../services/websocket';
import { ENV } from '../config/env';

let sharedClient: WSClient | null = null;

export function useWebSocket(sessionId: string) {
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<WSClient | null>(null);

  useEffect(() => {
    if (!ENV.wsUrl || !sessionId) return;

    // Reuse shared client if same session
    if (!sharedClient || sharedClient.connected === false) {
      sharedClient = new WSClient(ENV.wsUrl, sessionId);
      sharedClient.connect();
    }
    clientRef.current = sharedClient;

    const unsub = sharedClient.on('connection', (data: any) => {
      setConnected(data.connected);
    });
    setConnected(sharedClient.connected);

    return () => {
      unsub();
    };
  }, [sessionId]);

  const send = useCallback(
    (data: Record<string, unknown>) => {
      clientRef.current?.send(data);
    },
    [],
  );

  const subscribe = useCallback(
    (action: string, handler: (data: any) => void) => {
      return clientRef.current?.on(action, handler) || (() => {});
    },
    [],
  );

  return { connected, send, subscribe, isLive: ENV.isLive };
}
