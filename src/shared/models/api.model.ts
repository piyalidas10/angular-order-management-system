export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  timestamp: string;
}

export interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
  timestamp: string;
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
