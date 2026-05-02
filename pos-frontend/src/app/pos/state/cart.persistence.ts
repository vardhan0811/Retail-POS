import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CartItem } from '../cart/cart.service';

const KEY = 'pos.cart.v1';

@Injectable({ providedIn: 'root' })
export class CartPersistence {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  load(): CartItem[] | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      return parsed as CartItem[];
    } catch {
      return null;
    }
  }

  save(items: CartItem[]): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
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
}
