import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CartService } from './cart.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  styles: [`
    :host { display: block; height: 100%; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
  `],
  template: `
    <div class="h-full bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.04)] rounded-3xl flex flex-col relative overflow-hidden">
      <!-- Cart Header -->
      <div class="px-8 py-6 flex items-center justify-between border-b border-slate-50">
        <div>
          <h2 class="text-lg font-bold text-primary tracking-tight">Current Order</h2>
          <div class="flex items-center gap-2 mt-0.5">
            <span class="chip chip-neutral text-[9px] py-0 px-2">{{ cart.totalItemsCount() }} Units</span>
            <span class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ cart.items().length }} Unique SKUs</span>
          </div>
        </div>
        <button (click)="clearWithConfirm()" 
                [disabled]="cart.items().length === 0 || isProcessing" 
                class="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-0">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>

      <!-- Items Area -->
      <div class="flex-1 overflow-y-auto px-4 py-2 custom-scrollbar">
        <div *ngFor="let item of cart.items()" class="cart-item group">
          <!-- Thumbnail Placeholder -->
          <div class="cart-item-img flex-shrink-0 group-hover:bg-accent/10 group-hover:text-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>

          <div class="cart-item-details">
            <div class="flex justify-between items-start gap-2">
              <span class="cart-item-title">{{ item.product.name }}</span>
              <span class="text-sm font-bold text-primary whitespace-nowrap">₹{{ (item.product.sellingPrice * item.quantity) | number:'1.2-2' }}</span>
            </div>
            
            <div class="flex items-center justify-between mt-2">
              <div class="cart-qty-control scale-90 -ml-2">
                <button (click)="onQty(item.product.id, item.quantity - 1)" class="cart-qty-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>
                </button>
                <span class="w-8 text-center text-xs font-black">{{ item.quantity }}</span>
                <button (click)="onQty(item.product.id, item.quantity + 1)" class="cart-qty-btn">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                </button>
              </div>
              <span class="text-[10px] font-bold text-muted opacity-60">@ ₹{{ item.product.sellingPrice }}</span>
            </div>
          </div>

          <!-- Quick Remove -->
          <button (click)="remove(item.product.id)" 
                  class="opacity-0 group-hover:opacity-100 w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all ml-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <!-- Empty State -->
        <div *ngIf="cart.items().length === 0" class="h-full flex flex-col items-center justify-center text-center py-20 animate-in fade-in zoom-in-95 duration-500">
           <div class="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-200">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
           </div>
           <h4 class="text-sm font-bold text-slate-400 uppercase tracking-[0.2em] mb-2">Cart is empty</h4>
           <p class="text-[10px] font-medium text-slate-300 uppercase tracking-widest px-12">Start adding products to begin a new sale</p>
        </div>
      </div>

      <!-- Cart Notes / Customer Lookup (Simplified) -->
      <div class="px-6 py-4 bg-slate-50/50 border-t border-slate-50 space-y-3" *ngIf="cart.items().length > 0">
        <div class="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100 shadow-sm group cursor-pointer hover:border-accent/30 transition-all">
          <div class="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <span class="text-[11px] font-bold text-muted group-hover:text-primary transition-colors">Associate Customer...</span>
        </div>
        
        <div class="relative group">
           <textarea placeholder="Add order note..." 
                    class="w-full bg-white border border-slate-100 rounded-xl px-4 py-2.5 text-[11px] font-medium placeholder:text-slate-300 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent/20 transition-all resize-none min-h-[60px]"></textarea>
        </div>
      </div>

      <!-- Financial Summary -->
      <div class="px-8 py-6 bg-white border-t border-slate-100">
        <div class="space-y-3 mb-6">
          <div class="flex justify-between items-center text-[11px] font-bold text-muted uppercase tracking-widest">
            <span>Subtotal</span>
            <span class="text-primary tracking-tight">₹{{ cart.subtotal() | number:'1.2-2' }}</span>
          </div>
          <div class="flex justify-between items-center text-[11px] font-bold text-muted uppercase tracking-widest">
            <span>Tax Amount</span>
            <span class="text-primary tracking-tight">₹{{ cart.tax() | number:'1.2-2' }}</span>
          </div>
          <div class="pt-4 border-t border-slate-50 flex items-center justify-between">
            <span class="text-sm font-black text-primary uppercase tracking-widest">Total Pay</span>
            <span class="text-3xl font-bold text-primary tracking-tighter">₹{{ cart.total() | number:'1.2-2' }}</span>
          </div>
        </div>

        <div class="flex flex-col gap-3">
          <button (click)="authorizePayment()" 
                  [disabled]="cart.items().length === 0 || isProcessing" 
                  class="pos-btn pos-btn-primary w-full py-4 text-sm relative overflow-hidden group">
            <ng-container *ngIf="!isProcessing">
              <span class="relative z-10">Proceed to Checkout (F4)</span>
              <div class="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </ng-container>
            <div *ngIf="isProcessing" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </button>
          
          <button (click)="holdSale()" 
                  [disabled]="cart.items().length === 0 || isProcessing" 
                  class="pos-btn pos-btn-secondary w-full py-3 text-[11px] uppercase tracking-widest">
            <span>Suspend Transaction</span>
          </button>
        </div>
      </div>
    </div>
  `
})
export class CartComponent {
  readonly cart = inject(CartService);
  private readonly router = inject(Router);

  isProcessing = false;

  onQty(productId: string, qty: number): void {
    if (this.isProcessing) return;
    if (qty <= 0) {
      if (confirm('Remove item from cart?')) {
        this.cart.remove(productId);
      }
      return;
    }
    this.cart.updateQuantity(productId, qty);
  }

  remove(productId: string): void {
    if (this.isProcessing) return;
    this.cart.remove(productId);
  }

  clearWithConfirm(): void {
    if (this.isProcessing) return;
    if (confirm('Clear all items from current cart?')) {
      this.cart.clear();
    }
  }

  holdSale(): void {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.cart.holdSale().subscribe({
      next: () => this.isProcessing = false,
      error: (err: any) => this.isProcessing = false
    });
  }

  authorizePayment(): void {
    if (this.cart.items().length === 0 || this.isProcessing) return;
    this.isProcessing = true;
    
    this.cart.authorizePayment().subscribe({
      next: (bill) => {
        this.isProcessing = false;
        this.router.navigate(['/pos/payment', bill.id]);
      },
      error: (err: any) => {
        this.isProcessing = false;
        const errorMsg = err?.error?.message || '';
        if (errorMsg.includes('available') || errorMsg.includes('cancelled')) {
          this.cart.clear();
        }
      }
    });
  }
}
