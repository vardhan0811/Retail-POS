import { Component, OnInit, ChangeDetectionStrategy, inject, ViewChild, ElementRef, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ProductApi, Product, Category } from '../../core/product.api';
import { CartService } from '../cart/cart.service';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, EMPTY, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, tap, shareReplay } from 'rxjs/operators';
import { ToastService } from '../../core/toast.service';
import { StoreContextService } from '../../core/store-context.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { combineLatest } from 'rxjs';

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; height: 100%; }

    .product-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      @apply gap-4 lg:gap-6;
      align-content: start;
    }

    .category-tab {
      @apply px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 border flex items-center gap-2 whitespace-nowrap;
    }

    .category-tab-active {
      @apply bg-slate-900 text-white border-slate-900 shadow-xl shadow-slate-900/10 -translate-y-0.5;
    }

    .category-tab-inactive {
      @apply bg-white text-slate-400 border-slate-100 hover:border-slate-200 hover:text-slate-900 hover:-translate-y-0.5;
    }

    .product-card {
      @apply relative bg-white border border-slate-100 rounded-[2rem] overflow-hidden transition-all duration-500 flex flex-col h-full hover:border-slate-200 hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1;
    }

    .image-container {
      @apply relative aspect-square w-full bg-slate-50 overflow-hidden;
    }

    .product-img {
      @apply w-full h-full object-cover transition-transform duration-700 group-hover:scale-110;
    }

    .image-skeleton {
      @apply absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50 bg-[length:200%_100%];
      animation: shimmer 2s infinite linear;
    }

    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .price-tag {
      @apply text-lg font-black text-slate-900 tracking-tighter;
    }

    .stock-badge {
      @apply absolute top-3 right-3 z-10 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest backdrop-blur-md shadow-sm;
    }

    .qty-stepper {
      @apply flex items-center bg-slate-900 rounded-xl overflow-hidden shadow-lg shadow-slate-900/20;
    }

    .stepper-btn {
      @apply w-8 h-8 flex items-center justify-center text-white hover:bg-white/10 active:scale-90 transition-all;
    }
  `],
  template: `
    <div class="h-full flex flex-col gap-6 animate-in fade-in duration-700" *ngIf="{ 
      products: products$ | async, 
      categories: categories$ | async,
      loading: loading$ | async,
      selectedCategory: selectedCategory$ | async
    } as vm">
      
      <!-- Premium Search & Category Navigation -->
      <div class="sticky top-0 z-30 bg-background/90 backdrop-blur-2xl pt-2 pb-4 -mt-2 space-y-5">
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div class="relative w-full xl:max-w-2xl group">
            <div class="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input #searchInput
                  [ngModel]="searchQuery$ | async" 
                  (ngModelChange)="onSearch($event)"
                  type="text" 
                  placeholder="BROWSE CATALOG OR SCAN BARCODE..." 
                  class="w-full bg-white border border-slate-100 rounded-[1.5rem] pl-16 pr-8 py-4 text-[13px] font-bold text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-8 focus:ring-slate-900/5 focus:border-slate-300 transition-all shadow-sm" />
          </div>

          <div class="flex items-center gap-3 ml-auto">
             <div class="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100/50">
                <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span class="text-[9px] font-black uppercase tracking-[0.1em]">Live Inventory</span>
             </div>
          </div>
        </div>

        <!-- Horizontal Scrollable Categories -->
        <div class="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button (click)="selectCategory(null)" 
                  class="category-tab"
                  [ngClass]="vm.selectedCategory === null ? 'category-tab-active' : 'category-tab-inactive'">
            All
          </button>
          
          <button *ngFor="let cat of vm.categories" 
                  (click)="selectCategory(cat.id)"
                  class="category-tab"
                  [ngClass]="vm.selectedCategory === cat.id ? 'category-tab-active' : 'category-tab-inactive'">
            {{ cat.name }}
          </button>
        </div>
      </div>

      <!-- Loading State: Rich Skeletons -->
      <div *ngIf="vm.loading" class="product-grid">
        <div *ngFor="let i of [1,2,3,4,5,6,7,8,9,10,11,12]" class="bg-white rounded-[2rem] border border-slate-50 p-4 space-y-4 shadow-sm">
           <div class="aspect-square w-full bg-slate-50 rounded-2xl animate-pulse"></div>
           <div class="h-4 w-2/3 bg-slate-50 rounded-full animate-pulse"></div>
           <div class="h-4 w-full bg-slate-50 rounded-full animate-pulse"></div>
           <div class="flex justify-between items-center pt-2">
              <div class="h-6 w-1/3 bg-slate-50 rounded-full animate-pulse"></div>
              <div class="h-10 w-10 bg-slate-50 rounded-xl animate-pulse"></div>
           </div>
        </div>
      </div>

      <!-- High-Density Product Grid -->
      <div class="product-grid pr-1" *ngIf="!vm.loading">
        <div *ngFor="let product of vm.products" 
             class="product-card group animate-in fade-in zoom-in-95 duration-500"
             [class.opacity-60]="product.stock <= 0">
          
          <!-- Stock Status Overlay -->
          <div *ngIf="product.stock > 10" class="stock-badge bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">In Stock</div>
          <div *ngIf="product.stock > 0 && product.stock <= 10" class="stock-badge bg-amber-500/10 text-amber-600 border border-amber-500/20">{{ product.stock }} Left</div>
          <div *ngIf="product.stock <= 0" class="stock-badge bg-slate-100 text-slate-400 border border-slate-200">Out of Stock</div>

          <!-- Hero Image Section -->
          <div class="image-container group-hover:cursor-pointer" (click)="addToCart(product)">
            <div class="image-skeleton" *ngIf="!imageLoaded[product.id]"></div>
            <img [src]="product.imageUrl || getFallbackImage(product)" 
                 (load)="imageLoaded[product.id] = true"
                 [alt]="product.name"
                 class="product-img"
                 [class.opacity-0]="!imageLoaded[product.id]">
            
            <!-- Quick Action Overlay -->
            <div class="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/20 to-transparent flex justify-center">
               <button *ngIf="getItemQuantity(product.id) === 0" 
                       (click)="$event.stopPropagation(); addToCart(product)"
                       class="w-full h-11 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                  Add to cart
               </button>
            </div>
          </div>

          <!-- Product Details -->
          <div class="p-4 flex flex-col flex-1">
            <div class="flex items-center justify-between mb-1">
              <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{{ getCategoryName(product.categoryId, vm.categories) }}</span>
            </div>
            
            <h3 class="text-[13px] font-bold text-slate-900 mb-3 line-clamp-2 leading-tight min-h-[2rem]">
              {{ product.name }}
            </h3>
            
            <div class="mt-auto flex items-center justify-between">
              <div class="flex flex-col">
                <span *ngIf="product.mrp > product.sellingPrice" class="text-[9px] font-bold text-slate-300 line-through">₹{{ product.mrp | number:'1.2-2' }}</span>
                <span class="price-tag">₹{{ product.sellingPrice | number:'1.2-2' }}</span>
              </div>
              
              <!-- Smart Action Button / Stepper -->
              <div *ngIf="getItemQuantity(product.id) === 0">
                 <button (click)="addToCart(product)" 
                         [disabled]="product.stock <= 0"
                         class="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-slate-900/20 transition-all duration-300">
                   <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                 </button>
              </div>

              <div *ngIf="getItemQuantity(product.id) > 0" class="qty-stepper animate-in zoom-in-95 duration-200">
                 <button (click)="updateQty(product, -1)" class="stepper-btn">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M20 12H4" /></svg>
                 </button>
                 <span class="px-2 text-[11px] font-black text-white w-6 text-center">{{ getItemQuantity(product.id) }}</span>
                 <button (click)="updateQty(product, 1)" class="stepper-btn">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
                 </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div *ngIf="!vm.loading && vm.products?.length === 0" class="flex flex-col items-center justify-center py-24 text-center animate-in fade-in slide-in-from-bottom-8">
        <div class="w-32 h-32 bg-white rounded-[3rem] border border-slate-100 flex items-center justify-center mb-8 text-slate-200 shadow-xl shadow-slate-200/20">
           <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
        </div>
        <h3 class="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tighter">No inventory found</h3>
        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] max-w-xs leading-relaxed">We couldn't find any products matching your search criteria or category filter.</p>
        <button (click)="resetFilters()" class="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 active:scale-95 transition-all">Clear Filters</button>
      </div>
    </div>
  `
})
export class ProductListComponent implements OnInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  private readonly productApi = inject(ProductApi);
  private readonly cartService = inject(CartService);
  private readonly toast = inject(ToastService);
  private readonly storeContext = inject(StoreContextService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  imageLoaded: { [key: string]: boolean } = {};
  
  searchQuery$ = new BehaviorSubject<string>('');
  selectedCategory$ = new BehaviorSubject<string | null>(null);
  loading$ = new BehaviorSubject<boolean>(false);
  products$!: Observable<Product[]>;
  categories$!: Observable<Category[]>;
  error: string | null = null;
  private readonly storeId$ = toObservable(this.storeContext.selectedStoreId);

  ngOnInit(): void {
    this.categories$ = this.productApi.getCategories().pipe(
      shareReplay(1),
      catchError(() => of([]))
    );

    this.products$ = combineLatest([
      this.searchQuery$.pipe(debounceTime(300), distinctUntilChanged()), 
      this.selectedCategory$,
      this.storeId$
    ]).pipe(
      switchMap(([query, categoryId, storeId]) => {
        if (!this.isBrowser) return EMPTY;
        this.loading$.next(true);
        this.error = null;
        this.imageLoaded = {}; // Reset image loading states on new search
        
        return this.productApi.getPaged({ 
          page: 1, 
          pageSize: 100, // Increased density
          search: query.trim() || undefined,
          categoryId: categoryId || undefined,
          storeId: storeId || undefined 
        }).pipe(
          map(res => res.items ?? []),
          tap(() => this.loading$.next(false)),
          catchError(err => {
            this.error = 'Failed to load inventory';
            this.loading$.next(false);
            return of([]);
          })
        );
      })
    );
  }

  onSearch(query: string): void {
    this.searchQuery$.next(query ?? '');
  }

  selectCategory(id: string | null): void {
    this.selectedCategory$.next(id);
  }

  getCategoryName(id: string, categories: Category[] | null): string {
    if (!categories) return '';
    return categories.find(c => c.id === id)?.name || 'General';
  }

  getItemQuantity(productId: string): number {
    return this.cartService.items().find(i => i.product.id === productId)?.quantity || 0;
  }

  addToCart(product: Product): void {
    if (product.stock <= 0) {
      this.toast.error(`${product.name} is out of stock`);
      return;
    }
    this.cartService.add(product, 1);
  }

  updateQty(product: Product, delta: number): void {
    const current = this.getItemQuantity(product.id);
    const target = current + delta;
    
    if (target <= 0) {
      this.cartService.remove(product.id);
    } else {
      if (delta > 0 && target > product.stock) {
        this.toast.warning('Max available stock reached');
        return;
      }
      this.cartService.updateQuantity(product.id, target);
    }
  }

  resetFilters(): void {
    this.searchQuery$.next('');
    this.selectedCategory$.next(null);
  }

  getFallbackImage(product: Product): string {
    // Return category specific SVG placeholders for premium feel
    const name = product.name.toLowerCase();
    if (name.includes('milk') || name.includes('cheese') || name.includes('butter') || name.includes('dairy')) return 'https://img.icons8.com/fluency/200/milk-bottle.png';
    if (name.includes('bread') || name.includes('bun') || name.includes('bakery') || name.includes('cake')) return 'https://img.icons8.com/fluency/200/bread.png';
    if (name.includes('apple') || name.includes('banana') || name.includes('fruit')) return 'https://img.icons8.com/fluency/200/apple.png';
    if (name.includes('carrot') || name.includes('potato') || name.includes('vegetable')) return 'https://img.icons8.com/fluency/200/carrot.png';
    if (name.includes('coke') || name.includes('soda') || name.includes('beverage') || name.includes('juice')) return 'https://img.icons8.com/fluency/200/soda-can.png';
    if (name.includes('chip') || name.includes('snack') || name.includes('chocolate')) return 'https://img.icons8.com/fluency/200/potato-chips.png';
    if (name.includes('detergent') || name.includes('soap') || name.includes('cleaner') || name.includes('household')) return 'https://img.icons8.com/fluency/200/spray.png';
    
    return 'https://img.icons8.com/fluency/200/box.png';
  }

  focusSearch(): void {
    this.searchInput?.nativeElement.focus();
  }
}
