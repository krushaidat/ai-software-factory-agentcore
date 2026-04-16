type MessageHandler = (data: any) => void;

export class WSClient {
  private ws: WebSocket | null = null;
  private url: string;
  private sessionId: string;
  private token: string | undefined;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private queue: string[] = [];
  private _connected = false;

  constructor(url: string, opts: { sessionId: string; token?: string }) {
    this.url = url;
    this.sessionId = opts.sessionId;
    this.token = opts.token;
  }

  get connected() {
    return this._connected;
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    let fullUrl = `${this.url}?sessionId=${this.sessionId}`;
    if (this.token) {
      fullUrl += `&token=${this.token}`;
    }
    this.ws = new WebSocket(fullUrl);

    this.ws.onopen = () => {
      this._connected = true;
      this.reconnectDelay = 1000;
      this.emit('connection', { connected: true });

      // Send init message
      this.send({ action: 'init', sessionId: this.sessionId });

      // Flush queued messages
      while (this.queue.length > 0) {
        const msg = this.queue.shift()!;
        this.ws?.send(msg);
      }

      // Start heartbeat (keep alive before API GW 10min idle timeout)
      this.heartbeatTimer = setInterval(() => {
        this.send({ action: 'ping' });
      }, 5 * 60 * 1000); // 5 minutes
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const action = data.action || 'unknown';
        this.emit(action, data);
      } catch {
        // ignore non-JSON messages
      }
    };

    this.ws.onclose = () => {
      this._connected = false;
      this.emit('connection', { connected: false });
      this.clearHeartbeat();
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror
    };
  }

  disconnect() {
    this.clearHeartbeat();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.onclose = null; // prevent auto-reconnect
      this.ws.close();
      this.ws = null;
    }
    this._connected = false;
  }

  send(data: Record<string, unknown>) {
    const msg = JSON.stringify(data);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      this.queue.push(msg);
    }
  }

  on(action: string, handler: MessageHandler) {
    if (!this.handlers.has(action)) {
      this.handlers.set(action, new Set());
    }
    this.handlers.get(action)!.add(handler);
    return () => {
      this.handlers.get(action)?.delete(handler);
    };
  }

  private emit(action: string, data: unknown) {
    this.handlers.get(action)?.forEach((handler) => {
      try {
        handler(data);
      } catch (e) {
        console.error(`WebSocket handler error for ${action}:`, e);
      }
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.connect();
    }, this.reconnectDelay);
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}
