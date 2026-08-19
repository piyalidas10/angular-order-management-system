import { Injectable, signal, OnDestroy, inject } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ConnectionStatus, WebSocketMessage } from '../../shared/models/api.model';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

type MessageHandler<T = unknown> = (data: T) => void;

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly authService = inject(AuthService);

  // WebSocket is a built-in Web API provided by the browser.
  private socket: WebSocket | null = null;
  private readonly destroy$ = new Subject<void>();
  private readonly handlers = new Map<string, Set<MessageHandler>>();
  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 10;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly status = signal<ConnectionStatus>('disconnected');

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    this.status.set('connecting');
    const token = this.authService.getAccessToken();
    const url = `${environment.wsUrl}?token=${token}`;

    try {
      this.socket = new WebSocket(url);
      this.bindEvents();
    } catch {
      this.status.set('error');
    }
  }

  disconnect(): void {
    this.clearHeartbeat();
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.socket?.close(1000, 'Manual disconnect');
    this.socket = null;
    this.status.set('disconnected');
  }

  on<T>(event: string, handler: MessageHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as MessageHandler);

    // Return unsubscribe function
    return () => this.handlers.get(event)?.delete(handler as MessageHandler);
  }

  emit(event: string, data: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ event, data }));
    }
  }

  private bindEvents(): void {
    if (!this.socket) return;

    this.socket.onopen = () => {
      this.status.set('connected');
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    };

    this.socket.onmessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as WebSocketMessage;
        if (msg.event === 'pong') return;
        const eventHandlers = this.handlers.get(msg.event);
        eventHandlers?.forEach(h => h(msg.data));
      } catch {
        // malformed message
      }
    };

    this.socket.onclose = (event: CloseEvent) => {
      this.clearHeartbeat();
      if (event.code !== 1000) {
        this.status.set('disconnected');
        this.scheduleReconnect();
      }
    };

    this.socket.onerror = () => {
      this.status.set('error');
    };
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.emit('ping', { timestamp: Date.now() });
    }, 30_000);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30_000);
    this.reconnectAttempts++;

    this.reconnectTimeout = setTimeout(() => {
      if (this.authService.isAuthenticated()) {
        this.connect();
      }
    }, delay);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.disconnect();
  }
}
