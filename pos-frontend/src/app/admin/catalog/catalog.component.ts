import { Component, inject, signal, effect, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductApi, Product, Category } from '../../core/product.api';
import { StoreContextService } from '../../core/store-context.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';

interface ProductForm {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  taxId: string;
  mrp: number;
  sellingPrice: number;
  isRefundable: boolean;
  refundWindowHours: number;
  isActive: boolean;
  imageUrl?: string;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-8 space-y-8">

      <!-- ─── Page Header ─── -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-3xl font-black text-primary tracking-tight">
            {{ auth.role === 'Admin' ? 'Global Catalog' : 'Store Catalog' }}
          </h2>
          <p class="text-muted font-medium mt-1">Manage global product definitions and categories.</p>
        </div>
        <div class="flex gap-3">
          <button (click)="showCategoryModal = true"
            class="px-6 py-2.5 bg-white border border-slate-200 text-secondary font-bold rounded-2xl shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/></svg>
            Manage Categories
          </button>
          <button (click)="openAddModal()"
            class="px-6 py-2.5 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add Product
          </button>
        </div>
      </div>

      <!-- ─── Filters ─── -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div class="relative col-span-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input type="text"
            [(ngModel)]="searchQuery"
            (ngModelChange)="onSearchChange()"
            placeholder="Search by name, SKU or barcode..."
            class="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold placeholder:opacity-50 focus:ring-2 focus:ring-primary/20 transition-all">
        </div>

        <select
          [value]="selectedCategoryId ?? ''"
          (change)="onCategoryChange($event)"
          class="py-3 px-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 cursor-pointer transition-all">
          <option value="">All Categories</option>
          <option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</option>
        </select>

        <div class="flex items-center gap-2 px-4 py-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
          <span class="text-[10px] font-black uppercase tracking-widest text-primary opacity-60">View Mode:</span>
          <span class="text-xs font-bold text-primary">{{ ctx.getStoreId() ? 'Store Direct' : 'Aggregated' }}</span>
        </div>
      </div>

      <!-- ─── Product Table ─── -->
      <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden min-h-[400px]">

        <!-- Loading skeleton -->
        <div *ngIf="isLoading()" class="p-8 space-y-4">
          <div *ngFor="let i of [1,2,3,4,5]" class="h-16 bg-slate-50 rounded-2xl animate-pulse"></div>
        </div>

        <!-- Table -->
        <table *ngIf="!isLoading() && products().length > 0" class="w-full text-left border-collapse">
          <thead>
            <tr class="bg-slate-50/50 border-b border-slate-100">
              <th class="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-50">Product Details</th>
              <th class="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-50 text-right">Price</th>
              <th class="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-50 text-center">Current Stock</th>
              <th class="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-50 text-center">Status</th>
              <th class="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-[0.2em] opacity-50 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr *ngFor="let p of products()" class="hover:bg-slate-50/80 transition-colors group">
              <td class="px-8 py-6">
                <div class="flex items-center gap-4">
                  <div class="w-12 h-12 rounded-2xl bg-white border border-slate-100 flex items-center justify-center font-black text-primary text-xl shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                    <img *ngIf="p.imageUrl" [src]="p.imageUrl" class="w-full h-full object-cover">
                    <span *ngIf="!p.imageUrl">{{ p.name.charAt(0) }}</span>
                  </div>
                  <div>
                    <h4 class="font-black text-secondary leading-tight">{{ p.name }}</h4>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="text-[10px] font-bold text-muted bg-slate-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">{{ p.sku }}</span>
                      <span class="text-[10px] font-bold text-primary/60 bg-primary/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">{{ categoryName(p.categoryId) }}</span>
                    </div>
                    <div *ngIf="p.updatedAt" class="text-[8px] font-bold text-muted opacity-40 uppercase tracking-tighter mt-1">
                       Updated by {{ p.updatedBy || 'System' }} {{ p.updatedAt | date:'short' }}
                    </div>
                  </div>
                </div>
              </td>
              <td class="px-8 py-6 text-right">
                <span class="font-black text-secondary text-lg">₹{{ p.sellingPrice | number:'1.2-2' }}</span>
              </td>
              <td class="px-8 py-6 text-center">
                <div class="flex flex-col items-center">
                  <span [class]="p.stock > 10 ? 'text-emerald-600' : p.stock > 0 ? 'text-amber-500' : 'text-red-500'" class="font-black text-xl">{{ p.stock }}</span>
                  <span class="text-[9px] font-black uppercase opacity-40 leading-none">In Hand</span>
                </div>
              </td>
              <td class="px-8 py-6 text-center">
                <button (click)="toggleStatus(p)" [disabled]="isSubmitting"
                  [class]="p.isActive ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'"
                  class="px-3 py-1 text-[10px] font-black rounded-full uppercase tracking-widest transition-colors disabled:opacity-50">
                  {{ p.isActive ? 'Active' : 'Inactive' }}
                </button>
              </td>
              <td class="px-8 py-6 text-right">
                <div class="flex items-center justify-end gap-2">
                  <button (click)="openEditModal(p)" class="p-2.5 rounded-xl hover:bg-white hover:shadow-md transition-all text-primary" title="Edit">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button (click)="deleteProduct(p)" [disabled]="isSubmitting" class="p-2.5 rounded-xl hover:bg-red-50 hover:shadow-md transition-all text-red-400 hover:text-red-600 disabled:opacity-30" title="Delete">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- Empty state -->
        <div *ngIf="!isLoading() && products().length === 0" class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
          </div>
          <h3 class="text-lg font-black text-primary mb-2 tracking-tight">No products found</h3>
          <p class="text-sm font-bold text-muted uppercase tracking-[0.2em] opacity-40">
            {{ selectedCategoryId || searchQuery ? 'Try clearing your filters' : 'Add your first product to get started' }}
          </p>
          <button *ngIf="!selectedCategoryId && !searchQuery" (click)="openAddModal()"
            class="mt-6 px-6 py-3 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-blue-100 hover:scale-[1.02] transition-all">
            + Add First Product
          </button>
        </div>
      </div>
    </div>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         PRODUCT MODAL (Add / Edit)
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <div *ngIf="showProductModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" (click)="closeOnBackdrop($event)">
      <div class="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl p-10 animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">

        <div class="flex items-center justify-between mb-8">
          <div>
            <h3 class="text-2xl font-black text-secondary tracking-tight">{{ editingProduct ? 'Edit Product' : 'Add Product' }}</h3>
            <p class="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mt-1 opacity-50">{{ editingProduct ? 'Update product details' : 'Define a new product in the global catalog' }}</p>
          </div>
          <button (click)="showProductModal = false" class="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <form (ngSubmit)="submitProduct()" #productForm="ngForm" class="space-y-5">

          <!-- Name + SKU row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="field-label">Product Name *</label>
              <input type="text" name="name" [(ngModel)]="form.name" required
                class="field-input" placeholder="e.g. Apple 1kg">
              <p *ngIf="formSubmitted && !form.name.trim()" class="field-error">Name is required</p>
            </div>
            <div>
              <label class="field-label">SKU *</label>
              <input type="text" name="sku" [(ngModel)]="form.sku" required
                class="field-input" placeholder="e.g. APPL-001">
              <p *ngIf="formSubmitted && !form.sku.trim()" class="field-error">SKU is required</p>
            </div>
          </div>

          <!-- Category -->
          <div>
            <label class="field-label">Category *</label>
            <select name="categoryId" [(ngModel)]="form.categoryId" required class="field-input">
              <option value="">Select a category...</option>
              <option *ngFor="let c of categories()" [value]="c.id">{{ c.name }}</option>
            </select>
            <p *ngIf="formSubmitted && !form.categoryId" class="field-error">Category is required</p>
          </div>

          <!-- Price row -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="field-label">MRP (₹) *</label>
              <input type="number" name="mrp" [(ngModel)]="form.mrp" required [min]="0"
                class="field-input" placeholder="0.00">
              <p *ngIf="formSubmitted && (form.mrp === null || form.mrp < 0)" class="field-error">Valid MRP required</p>
            </div>
            <div>
              <label class="field-label">Selling Price (₹) *</label>
              <input type="number" name="sellingPrice" [(ngModel)]="form.sellingPrice" required [min]="0"
                class="field-input" placeholder="0.00">
              <p *ngIf="formSubmitted && (!form.sellingPrice || form.sellingPrice <= 0)" class="field-error">Price must be > 0</p>
            </div>
          </div>

          <!-- Barcode -->
          <div>
            <label class="field-label">Barcode</label>
            <input type="text" name="barcode" [(ngModel)]="form.barcode"
              class="field-input" placeholder="Optional barcode / EAN">
          </div>

          <!-- Image URL -->
          <div>
            <label class="field-label">Product Image URL</label>
            <div class="flex gap-4 items-start">
              <input type="text" name="imageUrl" [(ngModel)]="form.imageUrl"
                class="field-input flex-1" placeholder="https://example.com/image.png">
              <div class="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                <img *ngIf="form.imageUrl" [src]="form.imageUrl" (error)="form.imageUrl = ''" class="w-full h-full object-cover">
                <svg *ngIf="!form.imageUrl" xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              </div>
            </div>
          </div>

          <!-- Refundable toggle -->
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div>
              <p class="text-sm font-bold text-secondary">Refundable</p>
              <p class="text-xs text-muted opacity-60">Allow returns / refund requests</p>
            </div>
            <button type="button" (click)="form.isRefundable = !form.isRefundable"
              [class]="form.isRefundable ? 'bg-primary' : 'bg-slate-200'"
              class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none">
              <span [class]="form.isRefundable ? 'translate-x-6' : 'translate-x-1'"
                class="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200"></span>
            </button>
          </div>

          <!-- Refund window (conditional) -->
          <div *ngIf="form.isRefundable">
            <label class="field-label">Refund Window (Hours)</label>
            <input type="number" name="refundWindowHours" [(ngModel)]="form.refundWindowHours" [min]="1"
              class="field-input" placeholder="e.g. 24">
          </div>

          <!-- Active toggle -->
          <div class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
            <div>
              <p class="text-sm font-bold text-secondary">Active</p>
              <p class="text-xs text-muted opacity-60">Inactive products won't appear in POS</p>
            </div>
            <button type="button" (click)="form.isActive = !form.isActive"
              [class]="form.isActive ? 'bg-emerald-500' : 'bg-slate-200'"
              class="relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none">
              <span [class]="form.isActive ? 'translate-x-6' : 'translate-x-1'"
                class="inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200"></span>
            </button>
          </div>

          <!-- Submit row -->
          <div class="flex gap-3 pt-2">
            <button type="button" (click)="showProductModal = false"
              class="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all">
              Cancel
            </button>
            <button type="submit" [disabled]="isSubmitting"
              class="flex-1 py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-blue-100 hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 transition-all">
              {{ isSubmitting ? (editingProduct ? 'Saving...' : 'Creating...') : (editingProduct ? 'Save Changes' : 'Create Product') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
         CATEGORY MODAL
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ -->
    <div *ngIf="showCategoryModal" class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in duration-300">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-black text-secondary tracking-tight">Manage Categories</h3>
          <button (click)="showCategoryModal = false" class="p-2 hover:bg-slate-100 rounded-full transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="flex gap-2 mb-6">
          <input #catInput type="text" placeholder="Enter category name..."
            class="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-primary/20 transition-all"
            (keydown.enter)="addCategory(catInput.value); catInput.value=''">
          <button (click)="addCategory(catInput.value); catInput.value=''"
            class="bg-primary text-white px-4 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] transition-all">
            Add
          </button>
        </div>

        <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
          <div *ngIf="categories().length === 0" class="text-center py-8 text-sm font-bold text-muted opacity-40 uppercase tracking-widest">
            No categories yet
          </div>
          <div *ngFor="let c of categories()" class="flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl group transition-colors">
            <span class="font-bold text-secondary">{{ c.name }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .field-label { @apply text-[10px] font-black text-muted uppercase tracking-[0.2em] mb-2 block; opacity: 0.6; }
    .field-input { @apply w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-secondary focus:ring-2 focus:ring-primary/20 transition-all; }
    .field-error { @apply text-xs text-red-500 font-bold mt-1 ml-1; }
  `]
})
export class AdminCatalogComponent implements OnInit {
  private readonly productApi = inject(ProductApi);
  protected readonly ctx = inject(StoreContextService);
  protected readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly products = signal<Product[]>([]);
  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal(false);
  isSubmitting = false;

  searchQuery = '';
  selectedCategoryId: string | null = null;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  showCategoryModal = false;
  showProductModal = false;
  editingProduct: Product | null = null;
  formSubmitted = false;

  form: ProductForm = {
    name: '', sku: '', barcode: '', categoryId: '', taxId: '',
    mrp: 0, sellingPrice: 0, isRefundable: true, refundWindowHours: 24, isActive: true, imageUrl: ''
  };

  private readonly categoryMap = computed(() => {
    const map = new Map<string, string>();
    this.categories().forEach(c => map.set(c.id, c.name));
    return map;
  });

  constructor() {
    // Reactively reload when store changes
    effect(() => {
      const storeId = this.ctx.selectedStoreId();
      this.loadProducts(storeId);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.loadCategories();
    const storeId = this.ctx.selectedStoreId();
    this.loadProducts(storeId);
  }

  categoryName(id: string): string { return this.categoryMap().get(id) ?? 'Unknown'; }

  onSearchChange(): void {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      const storeId = this.ctx.getStoreId();
      if (storeId) this.loadProducts(storeId);
    }, 300);
  }

  onCategoryChange(event: Event): void {
    const val = (event.target as HTMLSelectElement).value;
    this.selectedCategoryId = val || null;
    const storeId = this.ctx.getStoreId();
    this.loadProducts(storeId);
  }

  private loadProducts(storeId: string | null): void {
    this.isLoading.set(true);
    const params: Parameters<typeof this.productApi.getPaged>[0] = { 
      storeId, 
      pageSize: 50, 
      page: 1,
      forceRefresh: true 
    };
    if (this.searchQuery?.trim()) params.search = this.searchQuery.trim();
    if (this.selectedCategoryId) params.categoryId = this.selectedCategoryId;
    
    this.productApi.getPaged(params).subscribe({
      next: res => { 
        console.log('[CatalogComponent] Products loaded:', res.items?.length);
        this.products.set(res.items ?? []); 
        this.isLoading.set(false); 
      },
      error: (err: any) => { 
        console.error('[CatalogComponent] Load failed:', err);
        this.toast.error(err?.error?.message || 'Failed to load products'); 
        this.isLoading.set(false); 
      }
    });
  }

  loadCategories(): void {
    this.productApi.getCategories().subscribe({
      next: res => this.categories.set(res),
      error: () => this.toast.error('Failed to load categories')
    });
  }

  openAddModal(): void {
    this.editingProduct = null;
    this.form = { name: '', sku: '', barcode: '', categoryId: '', taxId: '', mrp: 0, sellingPrice: 0, isRefundable: true, refundWindowHours: 24, isActive: true, imageUrl: '' };
    this.formSubmitted = false;
    this.showProductModal = true;
  }

  openEditModal(product: Product): void {
    this.editingProduct = product;
    this.form = {
      name: product.name, sku: product.sku, barcode: product.barcode ?? '',
      categoryId: product.categoryId ?? '', taxId: product.taxId ?? '',
      mrp: product.mrp, sellingPrice: product.sellingPrice,
      isRefundable: product.isRefundable ?? true, refundWindowHours: product.refundWindowHours ?? 24,
      isActive: product.isActive ?? true,
      imageUrl: product.imageUrl ?? ''
    };
    this.formSubmitted = false;
    this.showProductModal = true;
  }

  closeOnBackdrop(event: Event): void {
    if (event.target === event.currentTarget) this.showProductModal = false;
  }

  submitProduct(): void {
    this.formSubmitted = true;
    if (!this.form.name.trim() || !this.form.sku.trim() || !this.form.categoryId || this.form.sellingPrice <= 0) {
      this.toast.error('Please fix the validation errors above');
      return;
    }
    this.isSubmitting = true;
    const payload = { ...this.form };
    const call = this.editingProduct ? this.productApi.patch(this.editingProduct.id, payload) : this.productApi.create(payload);
    call.subscribe({
      next: () => {
        this.toast.success(this.editingProduct ? 'Product updated successfully' : 'Product created successfully');
        this.showProductModal = false;
        this.isSubmitting = false;
        const storeId = this.ctx.getStoreId();
        this.loadProducts(storeId);
      },
      error: (err: any) => {
        this.toast.error(err?.error?.message || (this.editingProduct ? 'Failed to update product' : 'Failed to create product'));
        this.isSubmitting = false;
      }
    });
  }

  deleteProduct(product: Product): void {
    if (!confirm('Delete "' + product.name + '"? This action cannot be undone.')) return;
    this.productApi.delete(product.id).subscribe({
      next: () => { 
        this.toast.success('Product deleted'); 
        const storeId = this.ctx.getStoreId();
        this.loadProducts(storeId); 
      },
      error: (err: any) => this.toast.error(err?.error?.message || 'Failed to delete product')
    });
  }

  toggleStatus(product: Product): void {
    const nowActive = !product.isActive;
    this.productApi.patch(product.id, { isActive: nowActive }).subscribe({
      next: () => { 
        this.toast.success('Product ' + (nowActive ? 'activated' : 'deactivated')); 
        const storeId = this.ctx.getStoreId();
        this.loadProducts(storeId); 
      },
      error: (err: any) => this.toast.error(err?.error?.message || 'Failed to update status')
    });
  }

  addCategory(name: string): void {
    const trimmed = name?.trim();
    if (!trimmed) return;
    this.productApi.createCategory(trimmed).subscribe({
      next: () => { this.toast.success('Category added'); this.loadCategories(); },
      error: (err: any) => this.toast.error(err?.error?.message || 'Failed to add category')
    });
  }
}