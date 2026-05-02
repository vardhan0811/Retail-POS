import { Component, inject, signal, effect, computed, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductApi, Product, StockAdjustEntry } from '../../core/product.api';
import { StoreContextService } from '../../core/store-context.service';
import { DataService } from '../../core/data.service';
import { StoreDto } from '../../core/store.api';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 space-y-8">
      <!-- Header -->
      <div class="flex items-center justify-between mb-12">
      <div>
        <h2 class="text-4xl font-black text-secondary tracking-tight mb-2">Stock Management</h2>
        <div class="flex items-center gap-3">
          <p class="text-muted font-medium opacity-60">Manage inventory levels and view stock audit logs.</p>
          
          <!-- Dynamic Activity Message -->
          <div *ngIf="lastUpdateMessage" 
            [class]="lastUpdateType === 'INCREMENT' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'"
            class="flex items-center gap-2 px-3 py-1 rounded-full animate-in fade-in slide-in-from-left duration-500">
            <div [class]="lastUpdateType === 'INCREMENT' ? 'bg-emerald-500' : 'bg-red-500'" class="w-1.5 h-1.5 rounded-full animate-pulse"></div>
            <span class="text-[10px] font-black uppercase tracking-wider">{{ lastUpdateMessage }}</span>
          </div>

          <!-- Default Synced Message (if no recent update) -->
          <div *ngIf="!lastUpdateMessage && isSynced()" class="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full opacity-40">
            <div class="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
            <span class="text-[10px] font-black text-slate-500 uppercase tracking-wider">Inventory Synced</span>
          </div>
        </div>
      </div>

        <!-- Active store badge with change button -->
        <div *ngIf="ctx.selectedStoreId()" class="flex items-center gap-3">
          <div class="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-2xl px-4 py-2.5">
            <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span class="text-xs font-black text-primary uppercase tracking-wider">
              {{ selectedStoreName() }}
            </span>
          </div>
          <button
            (click)="ctx.selectStore(null)"
            class="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-bold text-xs transition-all">
            Change Store
          </button>
        </div>
      </div>

      <!-- ── Inline Store Picker (shown when no store selected) ── -->
      <div *ngIf="!ctx.selectedStoreId()">
        <div class="mb-6">
          <h3 class="text-lg font-black text-secondary tracking-tight">Select a Store to Manage</h3>
          <p class="text-sm font-medium text-muted mt-1">Stock adjustments are store-specific. Choose a location below to begin.</p>
        </div>

        <!-- Loading skeleton -->
        <div *ngIf="ctx.stores().length === 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div *ngFor="let i of [1,2,3]" class="h-32 bg-slate-50 rounded-[2rem] animate-pulse"></div>
        </div>

        <!-- Store Cards -->
        <div *ngIf="ctx.stores().length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            *ngFor="let store of ctx.stores()"
            (click)="selectStore(store)"
            class="group text-left bg-white border-2 border-slate-100 hover:border-primary/30 hover:bg-primary/[0.02] rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300">
            <div class="flex items-start justify-between mb-4">
              <div class="w-12 h-12 bg-primary/5 group-hover:bg-primary/10 rounded-2xl flex items-center justify-center transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
                </svg>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-200 group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
            <h4 class="font-black text-primary text-base leading-tight">{{ store.name }}</h4>
            <p class="text-[10px] font-bold text-muted uppercase tracking-wider mt-1 opacity-60">{{ store.location || store.address || 'No location set' }}</p>
          </button>
        </div>
      </div>

      <!-- ── Inventory Grid (shown when store is selected) ── -->
      <div *ngIf="ctx.selectedStoreId()" class="space-y-6">

        <!-- Loading state (Using isSynced indicator) -->
        <div *ngIf="!isSynced() && products().length === 0" class="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="h-48 bg-slate-50 rounded-[2rem] animate-pulse"></div>
        </div>

        <!-- Empty state -->
        <div *ngIf="isSynced() && products().length === 0" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6 text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
            </svg>
          </div>
          <h3 class="text-lg font-black text-primary mb-2 tracking-tight">No products found</h3>
          <p class="text-sm font-bold text-muted uppercase tracking-[0.2em] opacity-40">Add products via the Catalog tab first</p>
        </div>

        <!-- Product Cards -->
        <div *ngIf="products().length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-6" [class.opacity-50]="!isSynced()">
          <div *ngFor="let p of products()" class="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 hover:shadow-xl hover:shadow-slate-200/50 transition-all group">
            <div class="flex items-start justify-between mb-4">
              <div class="flex items-center gap-4">
                <div class="w-12 h-12 rounded-xl bg-primary/5 flex items-center justify-center font-black text-primary text-xl overflow-hidden border border-slate-100">
                   <img *ngIf="p.imageUrl" [src]="p.imageUrl" class="w-full h-full object-cover">
                   <span *ngIf="!p.imageUrl">{{ p.name.charAt(0) }}</span>
                </div>
                <div>
                  <h4 class="font-black text-secondary leading-tight">{{ p.name }}</h4>
                  <p class="text-[10px] font-bold text-muted uppercase tracking-wider">{{ p.sku }}</p>
                </div>
              </div>
              <div class="flex flex-col items-end">
                <span [class]="p.stock > 10 ? 'text-emerald-600' : p.stock > 0 ? 'text-amber-600' : 'text-red-600'" class="text-2xl font-black">{{ p.stock }}</span>
                <span class="text-[9px] font-black uppercase opacity-40">Units</span>
              </div>
            </div>

            <div class="h-px bg-slate-50 my-4"></div>

            <div class="grid grid-cols-2 gap-3">
              <button (click)="openAdjustModal(p, 'INCREMENT')" [disabled]="isSubmitting" class="flex items-center justify-center gap-2 py-3 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-xs hover:bg-emerald-100 transition-colors disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
                Restock
              </button>
              <button (click)="openAdjustModal(p, 'DECREMENT')" [disabled]="isSubmitting" class="flex items-center justify-center gap-2 py-3 bg-red-50 text-red-700 rounded-2xl font-black text-xs hover:bg-red-100 transition-colors disabled:opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4"/></svg>
                Reduce
              </button>
            </div>

            <div *ngIf="p.updatedAt" class="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
              <span class="text-[8px] font-bold text-muted uppercase opacity-40">Updated: {{ p.updatedAt | date:'short' }}</span>
              <span *ngIf="p.lastUpdatedBy" class="text-[8px] font-bold text-muted uppercase opacity-40">By: {{ p.lastUpdatedBy }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── Adjustment Modal ── -->
    <div *ngIf="selectedProduct" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div class="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in duration-300">
        <div class="flex items-center justify-between mb-8">
          <div>
            <h3 class="text-2xl font-black text-secondary tracking-tight">Stock Adjustment</h3>
            <p class="text-muted font-bold text-xs uppercase tracking-widest">{{ adjustmentMode }} : {{ selectedProduct.name }}</p>
          </div>
          <button (click)="selectedProduct = null" class="p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="space-y-6">
          <div class="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center justify-between">
            <div>
              <p class="text-[10px] font-black text-primary uppercase tracking-widest opacity-60">Current Store Stock</p>
              <p class="text-3xl font-black text-primary">{{ selectedProduct.stock }}</p>
            </div>
          </div>

          <div>
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block mx-2">Quantity to Change</label>
            <input
              type="number"
              [(ngModel)]="adjustAmount"
              class="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-2xl font-black text-secondary focus:ring-4 focus:ring-primary/10 transition-all"
              placeholder="0">
          </div>

          <div class="pt-4">
            <button
              (click)="submitAdjustment()"
              [disabled]="isSubmitting || !adjustAmount"
              class="w-full py-5 bg-primary text-white rounded-[2rem] font-black text-lg shadow-xl shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all">
              {{ isSubmitting ? 'Processing...' : 'Confirm Update' }}
            </button>
            <p class="text-center text-[10px] font-bold text-muted mt-4 opacity-40 uppercase tracking-tighter italic">* Audit log will be generated for this transaction</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`:host { display: block; }`]
})
export class AdminInventoryComponent implements OnInit {
  private readonly productApi = inject(ProductApi);
  private readonly dataService = inject(DataService);
  protected readonly ctx = inject(StoreContextService);
  private readonly toast = inject(ToastService);

  readonly products = toSignal(this.dataService.products$, { initialValue: [] as Product[] });
  readonly isSynced = toSignal(this.dataService.isSynced$, { initialValue: true });

  selectedProduct: Product | null = null;
  adjustmentMode: 'INCREMENT' | 'DECREMENT' = 'INCREMENT';
  adjustAmount: number = 0;
  lastUpdateMessage: string | null = null;
  lastUpdateType: 'INCREMENT' | 'DECREMENT' = 'INCREMENT';
  private messageTimeout: any;
  isSubmitting = false;

  /** Human-readable name of the selected store for the badge */
  readonly selectedStoreName = computed(() => {
    const id = this.ctx.selectedStoreId();
    if (!id) return '';
    return this.ctx.stores().find(s => s.id === id)?.name ?? id;
  });

  constructor() {
    effect(() => {
      const storeId = this.ctx.selectedStoreId();
      if (storeId) {
        this.loadInventory(storeId);
      }
    });
  }

  ngOnInit(): void {
    const storeId = this.ctx.selectedStoreId();
    if (storeId) {
      this.loadInventory(storeId);
    }
  }

  selectStore(store: StoreDto): void {
    this.toast.info(`Switching to ${store.name}...`);
    this.ctx.selectStore(store.id);
  }

  loadInventory(storeId: string): void {
    this.dataService.loadProducts({ storeId, pageSize: 100 });
  }

  openAdjustModal(product: Product, mode: 'INCREMENT' | 'DECREMENT'): void {
    this.selectedProduct = product;
    this.adjustmentMode = mode;
    this.adjustAmount = 0;
  }

  submitAdjustment(): void {
    if (!this.selectedProduct || !this.adjustAmount) return;
    const storeId = this.ctx.selectedStoreId();
    if (!storeId) return;

    this.isSubmitting = true;

    // Calculate delta for atomic update
    let change = this.adjustAmount;
    if (this.adjustmentMode === 'DECREMENT') change = -this.adjustAmount;

    this.dataService.updateInventory(this.selectedProduct.id, change, storeId).subscribe({
      next: (res) => {
        // Show success message
        this.lastUpdateType = this.adjustmentMode;
        const verb = this.adjustmentMode === 'INCREMENT' ? 'Restocked' : 'Reduced';
        this.lastUpdateMessage = `${verb} ${this.adjustAmount} units of ${this.selectedProduct?.name}`;

        // Clear message after 5 seconds
        if (this.messageTimeout) clearTimeout(this.messageTimeout);
        this.messageTimeout = setTimeout(() => this.lastUpdateMessage = null, 5000);

        this.isSubmitting = false;
        this.selectedProduct = null;

        if (this.lastUpdateType === 'INCREMENT') {
          this.toast.success(this.lastUpdateMessage || 'Inventory updated');
        } else {
          // Use error type to get RED color for reduction
          this.toast.error(this.lastUpdateMessage || 'Inventory updated');
        }
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update inventory');
        this.isSubmitting = false;
      }
    });
  }
}
