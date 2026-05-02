import { Component, OnInit, inject, HostListener, ViewChild, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { BillApi, BillDto, BillStatus } from '../../core/bill.api';
import { LastBillPersistence } from '../state/last-bill.persistence';
import { BillToCartMapper } from '../state/bill-to-cart.mapper';
import { ProductListComponent } from '../product-list/product-list.component';
import { CartComponent } from '../cart/cart.component';
import { CartService } from '../cart/cart.service';

@Component({
	selector: 'app-pos-shell',
	standalone: true,
	imports: [CommonModule, ProductListComponent, CartComponent],
	template: `
		<div class="px-6 lg:px-10 py-6 max-w-[2200px] mx-auto w-full animate-in fade-in duration-500 min-h-screen flex flex-col bg-background">
			
			<!-- System Callout: Suspended Sale (Premium Layered Style) -->
			<div *ngIf="resumeBill" class="bg-white border border-slate-100 rounded-3xl p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl shadow-blue-900/5 mb-8 animate-in fade-in slide-in-from-top-6">
				<div class="flex items-center gap-6">
					<div class="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-accent shadow-inner">
						<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					</div>
					<div>
						<div class="text-[10px] font-black text-muted uppercase tracking-widest mb-1">Unfinished Transaction Detected</div>
						<div class="text-base font-bold text-primary font-heading">
							Bill <span class="text-accent">#{{ resumeBill.billNumber }}</span> &bull; <span>₹{{ resumeBill.finalAmount | number:'1.2-2' }}</span>
						</div>
					</div>
				</div>
				<div class="flex gap-3">
					<button class="pos-btn pos-btn-secondary px-8 border-transparent" (click)="dismissResume()">Dismiss</button>
					<button class="pos-btn pos-btn-primary px-10" (click)="openResume()">Resume Access</button>
				</div>
			</div>

			<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1">
				<!-- Workspace (Product Catalog) -->
				<div class="lg:col-span-8 xl:col-span-9 min-w-0">
					<app-product-list #productList></app-product-list>
				</div>

				<!-- Cart Panel (Sticky) -->
				<aside class="lg:col-span-4 xl:col-span-3 min-w-[340px]">
					<div class="sticky top-6 h-[calc(100vh-6rem)]">
						<app-cart #cartComponent class="h-full"></app-cart>
					</div>
				</aside>
			</div>
		</div>
	`,
	styles: [`
		:host { display: block; }
	`]
})
export class PosShellComponent implements OnInit {
	@ViewChild('productList') productList!: ProductListComponent;
	@ViewChild('cartComponent') cartComponent!: CartComponent;

	private readonly auth = inject(AuthService);
	private readonly billApi = inject(BillApi);
	private readonly lastBill = inject(LastBillPersistence);
	private readonly billToCart = inject(BillToCartMapper);
	private readonly router = inject(Router);
	private readonly cart = inject(CartService);
	private readonly platformId = inject(PLATFORM_ID);
	private readonly isBrowser = isPlatformBrowser(this.platformId);

	resumeBill: BillDto | null = null;
	busy = false;
	public BillStatus = BillStatus;

	@HostListener('window:keydown', ['$event'])
	handleGlobalKeydown(event: KeyboardEvent) {
		const target = event.target as HTMLElement;
		const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

		// F2: Focus Search
		if (event.key === 'F2') {
			event.preventDefault();
			this.productList?.focusSearch();
			return;
		}

		// F4: Authorize Payment
		if (event.key === 'F4') {
			event.preventDefault();
			if (this.cart.items().length > 0) {
				this.cartComponent?.authorizePayment();
			}
			return;
		}

		// ESC: Clear Cart
		if (event.key === 'Escape') {
			if (this.cart.items().length > 0) {
				if (confirm('Reset current sale?')) {
					this.cart.clear();
				}
			}
			return;
		}

		// Auto-focus search on alpha-numeric typing (if not already in input)
		if (!isInput && event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
			this.productList?.focusSearch();
		}

		// +/-: Update quantity of last item
		const items = this.cart.items();
		if (items.length > 0 && !isInput) {
			const lastItem = items[items.length - 1];
			if (event.key === '+' || event.key === '=') {
				this.cart.updateQuantity(lastItem.product.id, lastItem.quantity + 1);
			}
			if (event.key === '-') {
				this.cart.updateQuantity(lastItem.product.id, lastItem.quantity - 1);
			}
		}
	}

	ngOnInit(): void {
		if (this.isBrowser) {
			const lastId = this.lastBill.get();
			
			console.log('[PosShell] Route:', this.router.url);
			console.log('[PosShell] Active Payment ID:', lastId);
			console.log('[PosShell] Restoration Handled:', this.lastBill.isRestored);

			if (lastId && !this.lastBill.isRestored) {
				this.billApi.getById(lastId).subscribe({
					next: (bill) => {
						// Mark as handled so back-navigation works normally
						this.lastBill.markRestored();

						// 4. SMART AUTO-RESTORE: Only redirect if truly pending payment on FIRST LOAD
						if (bill.status === BillStatus.Authorized) {
							console.log('[PosShell] Force Redirect to Payment:', bill.id);
							this.router.navigate(['/pos/payment', bill.id]);
						} else {
							this.lastBill.clear();
							if (bill.status === BillStatus.Draft || bill.status === BillStatus.Suspended) {
								this.resumeBill = bill;
							}
						}
					},
					error: () => this.lastBill.clear(),
				});
			} else {
				// Even if no redirect, mark as restored for future navigations
				this.lastBill.markRestored();
			}
		}
	}

	logout(): void {
		this.auth.logout();
	}

	dismissResume(): void {
		this.resumeBill = null;
		this.lastBill.clear();
	}

	openResume(): void {
		if (!this.resumeBill) return;
		if (this.resumeBill.status === BillStatus.Suspended) {
			this.router.navigate(['/pos/bill', this.resumeBill.id]);
			return;
		}
		this.billToCart.hydrateCartFromBill(this.resumeBill.id).subscribe({
			next: () => this.router.navigate(['/pos/payment', this.resumeBill!.id]),
			error: () => this.router.navigate(['/pos/payment', this.resumeBill!.id]),
		});
	}
}
