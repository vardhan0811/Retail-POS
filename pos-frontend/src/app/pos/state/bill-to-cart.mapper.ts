import { Injectable } from '@angular/core';
import { forkJoin, Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

import { BillApi, BillDto } from '../../core/bill.api';
import { Product, ProductApi } from '../../core/product.api';
import { CartItem, CartService } from '../cart/cart.service';

/**
 * Hydrates the local POS cart from an existing bill so UI quantities match the server bill.
 *
 * Contract:
 * - Input: billId (must exist and be accessible by current user)
 * - Output: Observable<void> that completes after cart is replaced (best-effort)
 * - Error mode: swallowed (we shouldn't block navigation); returns empty cart on total failure.
 */
@Injectable({ providedIn: 'root' })
export class BillToCartMapper {
  constructor(
    private readonly billApi: BillApi,
    private readonly productApi: ProductApi,
    private readonly cart: CartService,
  ) {}

  hydrateCartFromBill(billId: string): Observable<void> {
    return this.billApi.getById(billId).pipe(
      switchMap((bill) => this.hydrateCartFromBillDto(bill)),
      catchError(() => {
        // Best-effort: don't block resume flow.
        return of(void 0);
      }),
    );
  }

  hydrateCartFromBillDto(bill: BillDto): Observable<void> {
    const billItems = bill.items ?? [];
    if (!billItems.length) {
      this.cart.clear();
      return of(void 0);
    }

    // Fetch product details (so cart UI can show SKU/price/etc).
    const requests = billItems.map((i) =>
      this.productApi.getById(i.productId).pipe(
        map((p) => ({ product: p, quantity: i.quantity } satisfies CartItem)),
        // If a product can't be fetched (deleted/inactive), skip it.
        catchError(() => of(null)),
      ),
    );

    return forkJoin(requests).pipe(
      map((items) => items.filter((x): x is CartItem => !!x)),
      map((items) => this.dedupe(items)),
      map((items) => {
        this.cart.replace(items);
        return void 0;
      }),
      catchError(() => {
        // On any unexpected failure, don't mutate cart.
        return of(void 0);
      }),
    );
  }

  private dedupe(items: CartItem[]): CartItem[] {
    // Safety: if the bill has duplicates for the same product, merge quantities.
    const mapById = new Map<string, { product: Product; quantity: number }>();
    for (const i of items) {
      const existing = mapById.get(i.product.id);
      if (existing) existing.quantity += i.quantity;
      else mapById.set(i.product.id, { product: i.product, quantity: i.quantity });
    }
    return [...mapById.values()];
  }
}
