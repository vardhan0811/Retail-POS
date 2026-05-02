import { Injectable, signal, inject } from '@angular/core';
import { StoreApi, StoreDto, UpdateStoreRequest } from '../../core/store.api';
import { finalize } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AdminStoreDetailsService {
  private readonly api = inject(StoreApi);

  readonly loadingInit = signal(true);
  readonly error = signal<string | null>(null);
  readonly store = signal<StoreDto | null>(null);

  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saveSuccess = signal(false);
  

  loadStore(id: string): void {
    this.loadingInit.set(true);
    this.error.set(null);
    this.store.set(null);

    this.api.getStoreById(id)
      .pipe(finalize(() => this.loadingInit.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) {
            this.error.set(res.message || 'Failed to load store details');
          } else {
            this.store.set(res.data);
          }
        },
        error: () => this.error.set('Network error loading store')
      });
  }

  updateStore(id: string, body: UpdateStoreRequest): void {
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.api.updateStore(id, body)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) {
            this.saveError.set(res.message || 'Failed to save store configuration');
          } else {
            this.store.set(res.data);
            this.saveSuccess.set(true);
            setTimeout(() => this.saveSuccess.set(false), 3000);
          }
        },
        error: () => this.saveError.set('Network error saving store')
      });
  }

  deleteStore(id: string, callback: (success: boolean) => void): void {
    this.api.deleteStore(id)
      .subscribe({
        next: (res) => {
          if (!res.success) {
            callback(false);
          } else {
            callback(true);
          }
        },
        error: () => callback(false)
      });
  }
}
