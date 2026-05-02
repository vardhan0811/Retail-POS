import { Injectable, signal, effect, inject, computed } from '@angular/core';
import { Product } from '../../core/product.api';
import { CartPersistence } from '../state/cart.persistence';
import { BillApi, BillDto } from '../../core/bill.api';
import { Observable, tap, switchMap } from 'rxjs';
import { ToastService } from '../../core/toast.service';

export interface CartItem {
  product: Product;
  quantity: number;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly persistence = inject(CartPersistence);
  private readonly billApi = inject(BillApi);
  private readonly toast = inject(ToastService);

  private readonly _items = signal<CartItem[]>([]);
  readonly discount = signal<number>(0); 

  readonly items = this._items.asReadonly();
  
  readonly subtotal = computed(() => 
    this._items().reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0)
  );
  
  readonly tax = computed(() => 
    this._items().reduce((sum, i) => sum + (i.product.sellingPrice * i.quantity * (i.product.taxPercentage || 0) / 100), 0)
  );
  
  readonly total = computed(() => 
    this.subtotal() + this.tax() - this.discount()
  );
  
  readonly totalItemsCount = computed(() => 
    this._items().reduce((sum, i) => sum + i.quantity, 0)
  );

  readonly hasRefundable = computed(() => 
    this._items().some(i => i.product.isRefundable)
  );

  readonly hasNonRefundable = computed(() => 
    this._items().some(i => i.product.isRefundable === false)
  );

  readonly nonRefundableCount = computed(() => 
    this._items().filter(i => i.product.isRefundable === false).length
  );

  readonly isOrderRefundable = computed(() => 
    this.totalItemsCount() > 1 && !this.hasNonRefundable()
  );


  constructor() {
    const restored = this.persistence.load();
    if (restored?.length) {
      this._items.set(restored);
    }

    effect(() => {
      const items = this._items();
      if (!items.length) {
        this.persistence.clear();
      } else {
        this.persistence.save(items);
      }
    }, { allowSignalWrites: true });
  }

  canAdd(product: Product, quantity: number = 1): boolean {
    const current = this._items().find(i => i.product.id === product.id)?.quantity || 0;
    return (current + quantity) <= product.stock;
  }

  add(product: Product, quantity = 1): void {
    if (!this.canAdd(product, quantity)) {
      this.toast.error(`Cannot add more ${product.name}. Stock limit reached (${product.stock}).`);
      return;
    }

    const items = this._items();
    const idx = items.findIndex(i => i.product.id === product.id);
    if (idx >= 0) {
      const updated = [...items];
      updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
      this._items.set(updated);
    } else {
      this._items.set([...items, { product, quantity }]);
    }
  }

  updateQuantity(productId: string, quantity: number): void {
    if (quantity <= 0) return this.remove(productId);
    
    const items = this._items();
    const item = items.find(i => i.product.id === productId);
    if (item && quantity > item.product.stock) {
      this.toast.error(`Requested quantity exceeds available stock (${item.product.stock})`);
      return;
    }

    this._items.set(
      items.map(i => i.product.id === productId ? { ...i, quantity } : i)
    );
  }

  remove(productId: string): void {
    this._items.set(this._items().filter(i => i.product.id !== productId));
  }

  clear(): void {
    this._items.set([]);
    this.discount.set(0);
    this.persistence.clear();
  }

  clearCart(): void {
    this.clear();
  }

  holdSale(): Observable<any> {
    const items = this._items().map(i => ({
      productId: i.product.id,
      quantity: i.quantity
    }));

    return this.billApi.create({ items }).pipe(
      switchMap(bill => this.billApi.startPayment(bill.id).pipe(
        switchMap(() => this.billApi.hold(bill.id)),
        tap(() => {
          this.toast.success(`Order #${bill.billNumber} successfully suspended`);
          this.clear();
        })
      ))
    );
  }

  authorizePayment(): Observable<BillDto> {
    const items = this._items().map(i => ({
      productId: i.product.id,
      quantity: i.quantity
    }));

    return this.billApi.create({ items }).pipe(
      switchMap(bill => this.billApi.startPayment(bill.id)),
      tap((bill) => {
        this.toast.info(`Payment authorized for Order #${bill.billNumber}`);
        this.clear();
      })
    );
  }

  replace(items: CartItem[]): void {
    this._items.set(items);
  }
}
