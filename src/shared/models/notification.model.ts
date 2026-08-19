export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  relatedEntityId?: string;
  relatedEntityType?: string;
}

export interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
}
