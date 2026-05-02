import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const KEY = 'pos.activePaymentId.v1';

@Injectable({ providedIn: 'root' })
export class LastBillPersistence {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  
  // Track if we've already handled the initial restoration for this session
  private static _isRestored = false;

  get(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }

  set(id: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(KEY, id);
    } catch {
      // ignore
    }
  }

  clear(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // ignore
    }
  }

  get isRestored(): boolean {
    return LastBillPersistence._isRestored;
  }

  markRestored(): void {
    LastBillPersistence._isRestored = true;
  }
}
