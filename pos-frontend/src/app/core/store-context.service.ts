import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { StoreApi, StoreDto } from './store.api';
import { AuthService } from './auth.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { BehaviorSubject, map, of, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class StoreContextService {
  private readonly storeApi = inject(StoreApi);
  private readonly auth = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);

  // The active store selection for Admin dashboard
  private readonly _selectedStoreId = new BehaviorSubject<string | null>(null);
  readonly selectedStoreId$ = this._selectedStoreId.asObservable();

  // Signal version for backward compatibility where needed, but using subject for reactive triggers
  readonly selectedStoreId = toSignal(this.selectedStoreId$, { initialValue: null });

  // Available stores for selection
  readonly stores = toSignal(
    this.auth.identity$.pipe(
      switchMap(identity => {
        if (!isPlatformBrowser(this.platformId) || !identity || identity.role !== 'Admin') {
          return of([]);
        }
        return this.storeApi.getStores({ isActive: true, pageSize: 100 }).pipe(
          map(res => res.data?.items ?? [])
        );
      })
    ),
    { initialValue: [] as StoreDto[] }
  );

  constructor() {
    // If user is a Cashier, force their assigned store
    const userStoreId = this.auth.storeId;
    if (this.auth.role === 'Cashier' && userStoreId) {
      this._selectedStoreId.next(userStoreId);
    }
  }

  selectStore(id: string | null): void {
    if (this.auth.role === 'Admin') {
      this._selectedStoreId.next(id);
    }
  }

  getStoreId(): string | null {
    return this._selectedStoreId.value;
  }
}
