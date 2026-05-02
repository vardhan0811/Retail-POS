import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { CartService } from '../cart/cart.service';
import { BillApi } from '../../core/bill.api';
import { Router } from '@angular/router';
import { LastBillPersistence } from '../state/last-bill.persistence';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="h-full bg-gray-900 text-gray-200 p-6 flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
      <div class="w-full max-w-2xl bg-gray-800 rounded-lg shadow-lg border border-gray-700 p-6">
        <div class="flex items-center gap-4 mb-6">
          <button class="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2" (click)="goBack()">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
          <h2 class="text-2xl font-bold text-white mb-0">Checkout Summary</h2>
        </div>

        <div *ngIf="error" class="mb-4 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded text-sm">
          {{ error }}
        </div>

        <ng-container *ngIf="cart.items().length; else empty">
          <div class="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
            <div *ngFor="let item of cart.items()" class="flex flex-col sm:flex-row sm:items-center gap-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div class="flex-1">
                <div class="font-bold text-white text-lg">{{ item.product.name }}</div>
                <div class="text-sm text-gray-400 mt-1">₹{{ item.product.sellingPrice | number:'1.2-2' }} x {{ item.quantity }}</div>
              </div>
              <div class="font-black text-xl text-white">₹{{ (item.product.sellingPrice * item.quantity) | number:'1.2-2' }}</div>
            </div>
          </div>

          <div class="bg-gray-900 border border-gray-700 rounded-lg p-4 mb-6">
            <div class="flex justify-between items-center">
              <div class="text-gray-400 font-semibold text-lg">Subtotal:</div>
              <div class="text-2xl font-black text-white">₹{{ cart.total() | number:'1.2-2' }}</div>
            </div>
          </div>

          <button
            type="button"
            class="w-full px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            [disabled]="loading"
            (click)="checkout()"
          >
            <span *ngIf="!loading">Create Bill &amp; Proceed to Payment</span>
            <span *ngIf="loading" class="flex items-center justify-center gap-2">
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Calling POST /api/bills…
            </span>
          </button>
        </ng-container>

        <ng-template #empty>
          <div class="py-12 text-center text-gray-500 font-medium">
            Cart is empty. <button class="text-blue-400 underline ml-1" (click)="goBack()">Go back</button>
          </div>
        </ng-template>
      </div>
    </div>
  `
})
export class CheckoutComponent {
  readonly cart = inject(CartService);
  private readonly billApi = inject(BillApi);
  private readonly router = inject(Router);
  private readonly lastBill = inject(LastBillPersistence);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly location = inject(Location);

  loading = false;
  error: string | null = null;

  ngOnInit() {
    const items = typeof this.cart.items === 'function' ? this.cart.items() : this.cart.items;
    if (!items || !items.length) {
      window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Cart is empty. Returning...' }));
      this.goBack();
    }
  }

  goBack(): void {
    this.location.back();
  }

  checkout(): void {
// ... existing logic ...
  (window as any).lastCheckoutClicked = Date.now();
    console.log('[Checkout] CLICKED');
    // If using signals, access with .items() or .items.value, depending on implementation
    const items = typeof this.cart.items === 'function' ? this.cart.items() : this.cart.items;
    console.log('[Checkout] cart items:', items);
    if (!items || !items.length) {
      console.warn('[Checkout] No items in cart, aborting checkout');
      return;
    }

    this.loading = true;
    this.error = null;

    const payload = {
      items: items.map((i: any) => ({ productId: i.product.id, quantity: i.quantity }))
    };

    // DEBUG: log the exact payload being sent to confirm HTTP call fires
    console.log('[Checkout] CALLING API');
    console.log('[Checkout] POST /api/bills payload:', JSON.stringify(payload));

    // Always subscribe to ensure HTTP request is executed
    this.billApi.create(payload).subscribe({
      next: bill => {
        console.log('[Checkout] Bill created ✓ id:', bill.id, 'number:', bill.billNumber, 'status:', bill.status);
        
        this.billApi.startPayment(bill.id).subscribe({
          next: updatedBill => {
            this.loading = false;
            this.lastBill.set(updatedBill.id);
            window.dispatchEvent(new CustomEvent('show-toast', { detail: `Bill ${updatedBill.billNumber} created and pending payment!` }));
            this.router.navigate(['/pos/payment', updatedBill.id], { state: { source: 'terminal' } });
            this.cdr.markForCheck();
          },
          error: err => {
            this.loading = false;
            const msg = err?.error?.message || err?.error?.Message || err?.statusText || 'Unknown error';
            this.error = `Failed to transition state to AwaitingPayment (${err?.status ?? 'network'}): ${msg}`;
            console.error('[Checkout] POST /api/bills/{id}/start-payment FAILED', err);
            this.cdr.markForCheck();
          }
        });
      },
      error: err => {
        this.loading = false;
        const msg = err?.error?.message || err?.error?.Message || err?.statusText || 'Unknown error';
        this.error = `Failed to create bill (${err?.status ?? 'network'}): ${msg}`;
        console.error('[Checkout] POST /api/bills FAILED', err);
        this.cdr.markForCheck();
      }
    });
  }
}
