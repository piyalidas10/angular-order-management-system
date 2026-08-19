import { Injectable, signal, computed, inject } from '@angular/core';
import { AppNotification, NotificationType } from '../../shared/models/notification.model';
import { generateId } from '../../shared/utilities/helpers';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly _notifications = signal<AppNotification[]>([]);

  readonly notifications = this._notifications.asReadonly();
  readonly unreadCount = computed(() => this._notifications().filter(n => !n.read).length);

  show(
    type: NotificationType,
    title: string,
    message: string,
    relatedEntityId?: string,
    relatedEntityType?: string
  ): void {
    const notification: AppNotification = {
      id: generateId(),
      type,
      title,
      message,
      read: false,
      timestamp: new Date().toISOString(),
      relatedEntityId,
      relatedEntityType,
    };

    this._notifications.update(ns => [notification, ...ns].slice(0, 50));

    // Auto-dismiss info/success after 5 s
    if (type === 'info' || type === 'success') {
      setTimeout(() => this.dismiss(notification.id), 5000);
    }
  }

  success(title: string, message: string): void {
    this.show('success', title, message);
  }

  error(title: string, message: string): void {
    this.show('error', title, message);
  }

  info(title: string, message: string): void {
    this.show('info', title, message);
  }

  warning(title: string, message: string): void {
    this.show('warning', title, message);
  }

  markRead(id: string): void {
    this._notifications.update(ns =>
      ns.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  }

  markAllRead(): void {
    this._notifications.update(ns => ns.map(n => ({ ...n, read: true })));
  }

  dismiss(id: string): void {
    this._notifications.update(ns => ns.filter(n => n.id !== id));
  }

  clear(): void {
    this._notifications.set([]);
  }
}
