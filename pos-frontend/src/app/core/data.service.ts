import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { ProductApi, Product } from './product.api';
import { ToastService } from './toast.service';

@Injectable({ providedIn: 'root' })
export class DataService {
  private readonly productApi = inject(ProductApi);
  private readonly toast = inject(ToastService);

  private readonly _products = new BehaviorSubject<Product[]>([]);
  readonly products$ = this._products.asObservable();

  private readonly _isSynced = new BehaviorSubject<boolean>(true);
  readonly isSynced$ = this._isSynced.asObservable();

  loadProducts(params: any): void {
    this._isSynced.next(false);
    this.productApi.getPaged({ ...params, forceRefresh: true }).subscribe({
      next: (res) => {
        console.log('[DataService] Products loaded from backend:', res.items);
        this._products.next(res.items || []);
        this._isSynced.next(true);
      },
      error: (err) => {
        console.error('[DataService] Failed to load products:', err);
        this._isSynced.next(true);
        this.toast.error('Failed to sync products with server');
      }
    });
  }

  updateInventory(productId: string, change: number, storeId: string): Observable<any> {
    this._isSynced.next(false);
    return this.productApi.updateInventory({ productId, change, storeId }).pipe(
      tap({
        next: (res) => {
          if (res.success && res.data) {
            console.log('[DataService] Inventory update success:', res.data);
            const data = res.data;
            
            // Update central state
            const current = this._products.value;
            const updated = current.map(p => 
              p.id === productId ? { 
                ...p, 
                stock: data.newStock,
                updatedAt: data.updatedAt,
                lastUpdatedBy: data.lastUpdatedBy
              } : p
            );
            this._products.next(updated);
            this._isSynced.next(true);
          }
        },
        error: (err) => {
          console.error('[DataService] Inventory update failed:', err);
          this._isSynced.next(true);
        }
      })
    );
  }

  // Helper to get current state
  getProducts(): Product[] {
    return this._products.value;
  }
}
