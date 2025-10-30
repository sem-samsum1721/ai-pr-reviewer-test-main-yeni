import { WebhookEvent } from '../types';
import type { AnalysisEvent } from '../types';

class WebSocketService {
  private ws: WebSocket | null = null;
  private wsBase?: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private hostOverride: string | undefined;

  connect(): void {
    // Prevent duplicate sockets
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    console.log('🔌 Connecting to WebSocket server...');

    const apiBaseEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
    let originBase: string;

    if (apiBaseEnv && /^https?:\/\//.test(apiBaseEnv)) {
      originBase = apiBaseEnv.replace(/\/api\/?$/, '');
    } else if (typeof window !== 'undefined') {
      originBase = window.location.origin;
    } else {
      originBase = 'http://localhost:3000';
    }

    this.wsBase = originBase;

    // Build correct ws/wss URL using URL API and optional host override
    let baseUrl: URL;
    try {
      baseUrl = new URL(this.wsBase);
    } catch {
      baseUrl = new URL('http://localhost:3000');
    }

    const protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = this.hostOverride ?? baseUrl.hostname;
    const port = baseUrl.port ? `:${baseUrl.port}` : '';
    const wsUrl = `${protocol}//${host}${port}/ws`;

    console.log('🔌 Connecting via native WebSocket:', wsUrl);
    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ Native WebSocket connected');
      this.reconnectAttempts = 0;
      this.hostOverride = undefined; // reset override once connected
    };

    this.ws.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        const evt: WebhookEvent | undefined =
          data?.type === 'webhook_event' ? (data.detail || data) :
          data?.event === 'webhook_event' ? (data.detail || data) : undefined;
        if (evt) {
          window.dispatchEvent(new CustomEvent('webhook_event', { detail: evt }));
        }

        // Dispatch analysis events for pipeline statuses
        const analysisStatuses = new Set(['ANALYSIS_STARTED','ANALYSIS_RUNNING','ANALYSIS_PROCESSING','ANALYSIS_COMPLETE','ANALYSIS_FAILED']);
        if (typeof data?.status === 'string' && analysisStatuses.has(data.status)) {
          const analysisEvt: AnalysisEvent = {
            status: data.status,
            message: data.message,
            report: data.report,
            findings: data.findings,
            error: data.error,
          };
          window.dispatchEvent(new CustomEvent('analysis_event', { detail: analysisEvt }));
        }
      } catch {}
    };

    this.ws.onclose = (ev) => {
      console.log('❌ Native WebSocket disconnected:', ev.code);
      this.ws = null;
      this.handleReconnect();
    };

    this.ws.onerror = (error) => {
      // Avoid noisy console errors; handle graceful retry
      const wasOpen = this.ws?.readyState === WebSocket.OPEN;
      if (wasOpen) {
        console.warn('⚠️ Native WebSocket hiccup, continuing');
        return;
      }
      console.warn('⚠️ Native WebSocket connection error, retrying...', error);
      try { this.ws?.close(); } catch {}
      this.ws = null;
      this.handleReconnect(true);
    };
  }

  private handleReconnect(fromError = false): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      // On first error, try swapping localhost → 127.0.0.1 (common Windows quirk)
      if (fromError && this.wsBase) {
        try {
          const url = new URL(this.wsBase);
          if (url.hostname === 'localhost' && !this.hostOverride) {
            this.hostOverride = '127.0.0.1';
            console.log('🔁 Switching WS host to 127.0.0.1 for retry');
          }
        } catch {}
      }

      const delay = this.reconnectDelay * this.reconnectAttempts;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`);
      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  }

  disconnect(): void {
    if (this.ws) {
      console.log('🔌 Disconnecting native WebSocket...');
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return Boolean(this.ws && this.ws.readyState === WebSocket.OPEN);
  }

  // Subscribe to webhook events
  onWebhookEvent(callback: (event: WebhookEvent) => void): () => void {
    const handler = (event: CustomEvent<WebhookEvent>) => {
      callback(event.detail);
    };

    window.addEventListener('webhook_event', handler as EventListener);

    // Return cleanup function
    return () => {
      window.removeEventListener('webhook_event', handler as EventListener);
    };
  }

  // Subscribe to analysis events
  onAnalysisEvent(callback: (event: AnalysisEvent) => void): () => void {
    const handler = (event: CustomEvent<AnalysisEvent>) => {
      callback(event.detail);
    };

    window.addEventListener('analysis_event', handler as EventListener);

    return () => {
      window.removeEventListener('analysis_event', handler as EventListener);
    };
  }
}

export const websocketService = new WebSocketService();
