import { Component, OnInit, OnDestroy, ChangeDetectorRef, HostListener, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { BillApi, BillDto, BillStatus, RefundStatus } from '../../core/bill.api';
import { BillToCartMapper } from '../state/bill-to-cart.mapper';
import { ToastService } from '../../core/toast.service';
import { ReceiptComponent } from '../receipt/receipt.component';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ModalService } from '../../core/modal.service';

@Component({
  selector: 'app-bill-details',
  standalone: true,
  imports: [CommonModule, ReceiptComponent, FormsModule],
  styles: [`
    :host { display: block; background-color: var(--bg-primary); min-height: 100vh; }
  `],
  template: `
    <div class="min-h-screen bg-background text-primary pb-20" *ngIf="bill">
      <!-- SaaS Top Navigation -->
      <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border px-8 py-4 flex items-center justify-between no-print shadow-sm">
        <div class="flex items-center gap-5">
          <button (click)="goBack()" class="w-10 h-10 rounded-xl hover:bg-background text-secondary flex items-center justify-center transition-all border border-border bg-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div>
            <h1 class="text-base font-black text-primary tracking-tight">Bill <span class="text-accent">#{{ bill.billNumber }}</span></h1>
            <p class="text-[11px] text-muted font-bold uppercase tracking-wider flex items-center gap-2">
               {{ bill.createdAt | date:'medium' }}
               <span *ngIf="bill.status === 'Suspended' && !bill.isExpired" class="text-blue-500 lowercase font-medium tracking-normal">Expires in {{ getRemainingText() }}</span>
               <span *ngIf="bill.isExpired" class="text-rose-500 font-black uppercase tracking-widest">EXPIRED</span>
            </p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button *ngIf="bill.status !== BillStatus.Finalized" (click)="newSale()" class="pos-btn pos-btn-secondary">New Sale</button>
          
          <div class="relative group">
            <button 
              (click)="printReceipt()" 
              [disabled]="!canPrint"
              [class.opacity-50]="!canPrint"
              [class.cursor-not-allowed]="!canPrint"
              class="pos-btn pos-btn-primary flex items-center gap-2 px-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
            <div *ngIf="!canPrint" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Print available only after payment completion
            </div>
          </div>
        </div>
      </nav>

      <div class="max-w-4xl mx-auto px-6 mt-10 space-y-10 no-print">
        <!-- Status Feedback Messaging -->
        <div *ngIf="getStatusFeedback()" 
             class="px-6 py-4 rounded-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500"
             [ngClass]="getStatusFeedbackClass()">
           <div class="w-8 h-8 rounded-full flex items-center justify-center bg-white/20">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
           </div>
           <p class="text-sm font-black text-white uppercase tracking-wider">{{ getStatusFeedback() }}</p>
        </div>

        <div class="bg-white border border-border rounded-3xl p-8 shadow-sm relative overflow-hidden">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div class="flex items-center gap-6">
              <div class="w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm" [ngClass]="getStatusBg(bill.status)">
                 <ng-container [ngSwitch]="bill.status">
                   <svg *ngSwitchCase="BillStatus.Finalized" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                   <svg *ngSwitchCase="BillStatus.Refunded" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" /></svg>
                   <svg *ngSwitchCase="BillStatus.Cancelled" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                   <svg *ngSwitchCase="BillStatus.Authorized" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <svg *ngSwitchCase="BillStatus.Suspended" xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.1"><path stroke-linecap="round" stroke-linejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   <svg *ngSwitchDefault xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </ng-container>
              </div>
              <div>
                <h2 class="text-2xl font-black text-primary tracking-tight">{{ getStatusTitle(bill.status) }}</h2>
                <p class="text-sm font-medium text-secondary mt-1">Transaction created on {{ bill.createdAt | date:'mediumDate' }} at {{ bill.createdAt | date:'shortTime' }}</p>
              </div>
            </div>
            
            <!-- Refund Eligibility Section -->
            <div class="flex flex-col items-end gap-3" *ngIf="canShowRefundSection()">
              <div class="flex flex-col items-end gap-1 mb-2" *ngIf="refundableItems.length > 0">
                <p class="text-[9px] font-black text-muted uppercase tracking-[0.2em] mb-1">Eligible for Refund:</p>
                <div *ngFor="let item of refundableItems" class="flex items-center gap-2 text-[10px] font-bold text-secondary">
                  <span>{{ item.productName }}</span>
                  <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md lowercase font-medium">expires in {{ getItemRemainingTime(item) }}</span>
                </div>
              </div>

              <div class="flex gap-3 relative group">
                <button 
                  (click)="openRefundModal()" 
                  [disabled]="!isRefundEligible"
                  [class.opacity-50]="!isRefundEligible"
                  class="pos-btn pos-btn-danger px-8 flex items-center gap-2 shadow-lg shadow-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
                  Process Refund
                </button>
                
                <div *ngIf="!isRefundEligible" class="absolute bottom-full right-0 mb-2 px-4 py-2 bg-slate-900 text-white text-[10px] font-bold rounded-xl opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap pointer-events-none z-20 shadow-2xl border border-white/10">
                   {{ getRefundEligibilityReason() }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <section class="bg-white border border-border rounded-3xl p-8 shadow-sm">
          <div class="flex items-center justify-between mb-8">
            <div class="flex items-center gap-3">
              <div class="w-1.5 h-1.5 bg-accent rounded-full"></div>
              <h3 class="text-[11px] font-black text-secondary uppercase tracking-widest">Transaction Content</h3>
            </div>
          </div>

          <div class="mt-8 overflow-x-auto" *ngIf="bill.items.length">
            <table class="w-full text-left">
              <thead>
                <tr class="text-[10px] font-black text-muted uppercase tracking-widest border-b border-slate-50">
                  <th class="pb-4 pr-4">Product Name</th>
                  <th class="pb-4 px-4 text-center">Qty</th>
                  <th class="pb-4 px-4 text-right">Unit Price</th>
                  <th class="pb-4 pl-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-50">
                <tr *ngFor="let item of bill.items" class="group">
                  <td class="py-5 pr-4">
                    <p class="text-sm font-bold text-primary flex items-center gap-2">
                       {{ item.productName }}
                       <span *ngIf="!item.isRefundable" class="text-[9px] font-black bg-slate-100 text-muted px-2 py-0.5 rounded-full uppercase tracking-tighter">Non-refundable</span>
                       <span *ngIf="item.refundedQuantity > 0" class="text-[9px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase tracking-tighter">{{ item.refundedQuantity }} Refunded</span>
                    </p>
                  </td>
                  <td class="py-5 px-4 text-center text-sm font-medium text-secondary">{{ item.quantity }}</td>
                  <td class="py-5 px-4 text-right text-sm font-medium text-secondary">₹{{ item.unitPrice | number:'1.2-2' }}</td>
                  <td class="py-5 pl-4 text-right text-sm font-black text-primary">₹{{ item.totalPrice | number:'1.2-2' }}</td>
                </tr>
              </tbody>
            </table>

            <div class="mt-8 pt-8 border-t border-slate-100 flex flex-col items-end gap-3">
              <div class="flex items-center gap-12 text-sm">
                <span class="font-bold text-secondary">Subtotal</span>
                <span class="font-black text-primary w-24 text-right">₹{{ bill.totalAmount | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center gap-12 text-sm">
                <span class="font-bold text-secondary">Tax (GST)</span>
                <span class="font-black text-primary w-24 text-right">₹{{ bill.taxAmount | number:'1.2-2' }}</span>
              </div>
              <div class="flex items-center gap-12 text-lg mt-2 font-black">
                <span class="text-primary">Total Amount</span>
                <span class="text-blue-600 w-32 text-right">₹{{ bill.finalAmount | number:'1.2-2' }}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

    <footer class="fixed bottom-0 left-0 right-0 bg-white border-t border-border no-print px-8 py-6 z-50 shadow-lg" *ngIf="bill">
       <div class="max-w-4xl mx-auto flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div class="hidden sm:block text-left">
             <p class="text-[10px] text-muted uppercase font-black tracking-widest">Operator Console</p>
             <p class="text-xs text-secondary font-medium uppercase tracking-tight">Cloud Sync Active</p>
          </div>
          <div class="flex w-full sm:w-auto gap-3">
             <button (click)="goBack()" [disabled]="busy" [class.pointer-events-none]="busy" class="pos-btn pos-btn-secondary px-8">Back to Registry</button>
             
             <button *ngIf="bill.status === BillStatus.Draft || bill.status === BillStatus.Authorized" 
                     (click)="goToPayment()" 
                     [disabled]="busy"
                     [class.pointer-events-none]="busy"
                     class="pos-btn pos-btn-primary px-10">
                PROCEED TO PAY
             </button>

             <button *ngIf="bill.status === BillStatus.Suspended" 
                     (click)="resumeOrder()" 
                     [disabled]="busy || bill.isExpired || !canResume()"
                     [class.pointer-events-none]="busy || bill.isExpired"
                     class="pos-btn pos-btn-primary px-10 disabled:opacity-50">
                {{ bill.isExpired ? 'ORDER EXPIRED' : 'RESUME ORDER' }}
             </button>

             <button *ngIf="bill.status === BillStatus.Suspended" 
                     (click)="cancelOrder()" 
                     [disabled]="busy"
                     class="pos-btn pos-btn-secondary px-8 border-rose-100 text-rose-500">
                VOID BILL
             </button>
             
             <button *ngIf="bill.status === BillStatus.Finalized || bill.status === BillStatus.Cancelled || bill.status === BillStatus.Refunded || bill.status === BillStatus.PartialRefund" 
                     (click)="newSale()" 
                     class="pos-btn pos-btn-secondary bg-slate-900 border-slate-900 text-white hover:bg-black px-10">
                START NEW SALE
             </button>
          </div>
       </div>
    </footer>

    <div class="print-root" *ngIf="receipt">
      <div class="print-only receipt-container">
        <app-receipt [data]="receipt"></app-receipt>
      </div>
    </div>
  </div>
  `
})
export class BillDetailsComponent implements OnInit, OnDestroy {
  bill: BillDto | null = null;
  receipt: any | null = null;
  busy = false;
  currentTime = Date.now();
  private destroy$ = new Subject<void>();
  public BillStatus = BillStatus;

  private readonly platformId = inject(PLATFORM_ID);
  private readonly modal = inject(ModalService);

  constructor(
    private route: ActivatedRoute,
    private billApi: BillApi,
    private router: Router,
    private billToCart: BillToCartMapper,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private auth: AuthService
  ) {}
  
  private timer: any;
  private syncTimer: any;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const id = this.route.snapshot.paramMap.get('id')!;
      if (id) this.reload(id);

      interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.currentTime = Date.now();
        this.cdr.detectChanges();
      });
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timer) clearInterval(this.timer);
    this.stopSyncPolling();
  }

  canResume(): boolean {
    if (!this.bill || this.bill.status !== BillStatus.Suspended) return false;
    const user = this.auth.identity;
    if (!user) return false;
    if (user.role === 'Admin') return true;
    return this.bill.suspendedBy === user.userId;
  }

  getRemainingText(): string {
    if (!this.bill?.suspendedAt) return '--:--';
    const ttl = this.bill.ttlMinutes || 15;
    const expiresAt = new Date(this.bill.suspendedAt).getTime() + (ttl * 60 * 1000);
    const seconds = Math.max(0, Math.floor((expiresAt - this.currentTime) / 1000));
    
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  resumeOrder(): void {
    if (!this.bill) return;
    this.busy = true;
    this.billApi.resume(this.bill.id).subscribe({
       next: () => {
          this.billToCart.hydrateCartFromBillDto(this.bill!).subscribe();
          this.toast.success(`Resumed Order #${this.bill!.billNumber}`);
          this.busy = false;
          this.router.navigate(['/pos']);
       },
       error: (err: any) => {
          this.busy = false;
          this.toast.error(err.error?.message || 'Failed to resume order');
          this.reload(this.bill!.id);
       }
    });
  }

  cancelOrder(): void {
    if (!this.bill) return;
    if (!confirm('Are you sure you want to void this suspended order?')) return;
    
    this.busy = true;
    this.billApi.cancel(this.bill.id).subscribe({
       next: () => {
          this.busy = false;
          this.toast.success('Order voided successfully');
          this.reload(this.bill!.id);
       },
       error: (err: any) => {
          this.busy = false;
          this.toast.error(err.error?.message || 'Failed to void order');
       }
    });
  }

  private reload(id: string): void {
    this.billApi.getById(id).subscribe({
      next: (bill: BillDto) => {
        this.bill = bill;
        
        if (bill?.status === BillStatus.Draft || bill?.status === BillStatus.Suspended || bill?.status === BillStatus.Authorized) {
          this.billToCart.hydrateCartFromBillDto(bill).subscribe();
        }

        if (bill?.status === BillStatus.Finalized || 
            bill?.status === BillStatus.Refunded ||
            bill?.status === BillStatus.PartialRefund) {
            this.billApi.getReceipt(id).subscribe(res => {
                this.receipt = res;
                this.cdr.detectChanges();
            });
        }

        if (bill?.status === BillStatus.RefundRequested) {
           this.startSyncPolling(id);
        } else {
           this.stopSyncPolling();
        }

        this.cdr.detectChanges();
      },
      error: () => this.toast.error('Failed to load bill')
    });
  }

  get canPrint(): boolean {
    return this.bill?.status === BillStatus.Finalized || 
           this.bill?.status === BillStatus.Refunded ||
           this.bill?.status === BillStatus.PartialRefund;
  }

  get isRefundEligible(): boolean {
    if (!this.bill) return false;
    const s = (this.bill.status || '').toString().toUpperCase();
    if (s !== 'FINALIZED' && s !== 'PARTIALREFUND') return false;
    return this.refundableItems.length > 0;
  }

  get refundableItems() {
    if (!this.bill) return [];
    return this.bill.items.filter(i => i.isRefundEligible);
  }

  getItemRemainingTime(item: any): string {
    if (!item.refundDeadline) return '';
    const deadline = new Date(item.refundDeadline).getTime();
    const remainingMs = deadline - this.currentTime;
    
    if (remainingMs <= 0) return 'expired';

    const hours = Math.floor(remainingMs / (1000 * 60 * 60));
    const mins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  }

  getRefundEligibilityReason(): string {
    if (!this.bill) return '';
    const s = (this.bill.status || '').toString().toUpperCase();
    if (s !== 'FINALIZED' && s !== 'PARTIALREFUND') 
      return 'Only finalized sales can be refunded';
    
    if (this.bill.items.every(i => !i.isRefundable)) return 'Items are non-refundable';
    if (this.bill.items.every(i => i.refundedQuantity >= i.quantity)) return 'All items already refunded';

    return 'Checking eligibility...';
  }

  private startSyncPolling(id: string) {
    if (this.syncTimer) return;
    this.syncTimer = setInterval(() => {
       this.billApi.getById(id).subscribe({
          next: (updated) => {
             if (updated.status !== BillStatus.RefundRequested) {
                this.toast.success('System sync: Refund state updated');
                this.reload(id);
             }
          }
       });
    }, 5000);
  }

  private stopSyncPolling() {
    if (this.syncTimer) {
       clearInterval(this.syncTimer);
       this.syncTimer = null;
    }
  }

  getStatusFeedback(): string | null {
    if (!this.bill) return null;
    switch (this.bill.status) {
      case BillStatus.Finalized: return 'Payment completed successfully. All items synced to inventory.';
      case BillStatus.Refunded: return 'Transaction fully refunded. Items returned to stock.';
      case BillStatus.PartialRefund: return 'Partial refund processed. Settlement updated.';
      case BillStatus.Cancelled: return 'Sale record cancelled. This document is for audit only.';
      case BillStatus.RefundRequested: return 'Refund pending administrative approval.';
      default: return null;
    }
  }

  getStatusFeedbackClass(): string {
    if (!this.bill) return '';
    switch (this.bill.status) {
      case BillStatus.Finalized: return 'bg-emerald-600 border-emerald-400';
      case BillStatus.Refunded: return 'bg-purple-600 border-purple-400';
      case BillStatus.PartialRefund: return 'bg-indigo-600 border-indigo-400';
      case BillStatus.Cancelled: return 'bg-rose-600 border-rose-400';
      case BillStatus.RefundRequested: return 'bg-amber-600 border-amber-400';
      default: return 'bg-slate-600 border-slate-400';
    }
  }

  goToPayment(): void {
    if (!this.bill) return;

    if (this.bill.status === BillStatus.Authorized) {
      this.router.navigate(['/pos/payment', this.bill.id], { state: { source: 'registry' } });
      return;
    }

    if (this.bill.status === BillStatus.Draft || this.bill.status === BillStatus.Suspended) {
      this.busy = true;
      this.billApi.startPayment(this.bill.id).subscribe({
        next: (updatedBill) => {
          this.busy = false;
          this.router.navigate(['/pos/payment', updatedBill.id], { state: { source: 'registry' } });
        },
        error: (err: any) => {
          this.busy = false;
          this.toast.error('Failed to update bill state');
          this.cdr.detectChanges();
        }
      });
    } else {
      this.router.navigate(['/pos/payment', this.bill.id], { state: { source: 'registry' } });
    }
  }

  openRefundModal() { 
    if (this.bill) {
      this.modal.openRefundModal(this.bill);
    }
  }

  canShowRefundSection(): boolean {
    if (!this.bill) return false;
    const s = (this.bill.status || '').toString().toUpperCase();
    return s === 'FINALIZED' || s === 'PARTIALREFUND' || s === 'REFUNDREQUESTED';
  }
  
  goBack() { this.router.navigate(['/pos/bills']); }
  newSale() { this.router.navigate(['/pos']); }

  printReceipt() {
    if (!this.canPrint) return;
    window.print();
  }

  getStatusBg(status: string): string {
    switch (status) {
      case BillStatus.Authorized: return 'bg-orange-50 text-orange-600 border-orange-100';
      case BillStatus.Draft: return 'bg-yellow-50 text-yellow-600 border-yellow-100';
      case BillStatus.Finalized: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case BillStatus.Cancelled: return 'bg-red-50 text-red-600 border-red-100';
      case BillStatus.Refunded: return 'bg-purple-50 text-purple-600 border-purple-100';
      case BillStatus.PartialRefund: return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case BillStatus.Suspended: return 'bg-blue-50 text-blue-600 border-blue-100';
      case BillStatus.RefundRequested: return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-400';
    }
  }

  getStatusTitle(status: string): string {
    switch (status) {
      case BillStatus.Authorized: return 'Processing Payment';
      case BillStatus.Draft: return 'Awaiting Review';
      case BillStatus.Finalized: return 'Sale Finalized';
      case BillStatus.Cancelled: return 'Sale Cancelled';
      case BillStatus.Refunded: return 'Fully Refunded';
      case BillStatus.PartialRefund: return 'Partially Refunded';
      case BillStatus.Suspended: return 'Sale Suspended';
      case BillStatus.RefundRequested: return 'Refund Requested';
      case BillStatus.Expired: return 'Sale Expired';
      default: return status;
    }
  }
}
