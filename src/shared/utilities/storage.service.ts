import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly prefix = 'oms_';

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch {
      // storage quota exceeded
    }
  }

  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(this.prefix + key);
      return item ? (JSON.parse(item) as T) : null;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    Object.keys(localStorage)
      .filter(k => k.startsWith(this.prefix))
      .forEach(k => localStorage.removeItem(k));
  }
}
