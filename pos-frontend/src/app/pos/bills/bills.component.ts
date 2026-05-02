import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, inject, ViewChild, ElementRef, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { BillApi, BillDto, BillStatus, canPerformBillAction, BillAction, RefundStatus } from '../../core/bill.api';
import { PrintService } from '../../core/print.service';
import { BillToCartMapper } from '../state/bill-to-cart.mapper';
import { ToastService } from '../../core/toast.service';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, interval, of, Subject, filter, timer } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, map, shareReplay, switchMap, takeUntil, startWith, tap } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { ModalService } from '../../core/modal.service';

export type StatusFilter = 'All' | 'Authorized' | 'Draft' | 'Finalized' | 'Cancelled' | 'Refunded' | 'Suspended';

interface GroupedBills {
  title: string;
  items: BillDto[];
}

@Component({
  selector: 'app-bills',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host { display: block; }
    .pagination-container { @apply flex items-center justify-end gap-3 bg-white p-1 rounded-full shadow-sm border border-slate-50; }
    .page-number { @apply w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-muted transition-all cursor-pointer; }
    .page-number.active { @apply bg-primary text-white shadow-md; }
    .drawer-section { @apply py-8 border-b border-slate-50; }
    .drawer-label { @apply text-[8px] font-black text-muted uppercase tracking-[0.2em] mb-4; }
  `],
  template: `
    <div class="max-w-[1600px] mx-auto p-10 lg:p-12 space-y-10 animate-in fade-in duration-700">
      
      <!-- Premium KPI Dashboard -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" *ngIf="stats$ | async as stats">
        <div class="pos-card p-8 border border-slate-50 relative group overflow-hidden">
          <div class="absolute inset-0 bg-blue-50/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <p class="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-3">Revenue Today</p>
          <div class="flex items-end justify-between">
            <h3 class="text-3xl font-black text-primary tracking-tighter">₹{{ stats.todayRevenue | number:'1.0-0' }}</h3>
            <div class="trend-up text-[10px] font-bold" [class.text-emerald-500]="stats.revenueChangePercentage >= 0" [class.text-rose-500]="stats.revenueChangePercentage < 0">
              <svg *ngIf="stats.revenueChangePercentage >= 0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" /></svg>
              <svg *ngIf="stats.revenueChangePercentage < 0" xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" /></svg>
              {{ Math.abs(stats.revenueChangePercentage) }}%
            </div>
          </div>
        </div>
        
        <div class="pos-card p-8 border border-slate-50 relative group overflow-hidden">
          <p class="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-3">Bills Processed</p>
          <div class="flex items-end justify-between">
            <h3 class="text-3xl font-black text-primary tracking-tighter">{{ stats.todayTransactions }} <span class="text-[10px] opacity-20">Sales</span></h3>
            <div class="trend-up text-[10px] font-bold text-emerald-500">+{{ stats.todayTransactions }} Today</div>
          </div>
        </div>

        <div class="pos-card p-8 border border-slate-50 relative group overflow-hidden">
          <p class="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-3">Average Bill</p>
          <div class="flex items-end justify-between">
            <h3 class="text-3xl font-black text-primary tracking-tighter">₹{{ stats.todayAvgBillValue | number:'1.0-0' }} <span class="text-[10px] opacity-20">Avg</span></h3>
            <div class="trend-up text-[10px] font-bold text-slate-400">Yield</div>
          </div>
        </div>

        <div class="pos-card p-8 border border-slate-50 relative group overflow-hidden">
          <p class="text-[9px] font-black text-muted uppercase tracking-[0.3em] mb-3">Growth Index</p>
          <div class="flex items-end justify-between">
            <h3 class="text-3xl font-black text-primary tracking-tighter">{{ stats.revenueChangePercentage > 0 ? 'High' : 'Stable' }} <span class="text-[10px] opacity-20">Perf</span></h3>
            <span class="text-[9px] font-bold text-muted/40 uppercase">Real-time</span>
          </div>
        </div>
      </div>

      <!-- Ledger Console -->
      <div class="space-y-6" *ngIf="vm$ | async as vm">
        
        <!-- Action & Filter Bar -->
        <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div class="flex items-center gap-2 p-1.5 bg-slate-100/60 rounded-2xl w-fit border border-slate-100">
            <button *ngFor="let t of tabs" 
                    (click)="setStatus(t.id)" 
                    [ngClass]="status === t.id ? 'bg-white shadow-md text-primary' : 'text-muted hover:text-primary'"
                    class="px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all">{{ t.label }}</button>
          </div>

          <div class="flex items-center gap-4 flex-1 justify-end">
            <div class="relative max-w-md w-full group">
              <svg class="absolute left-5 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text"
                    [(ngModel)]="search"
                    (ngModelChange)="search$.next($event)"
                    placeholder="Search Bill #, Customer, or SKU..." 
                    class="w-full bg-white border border-slate-100 rounded-full pl-14 pr-6 py-3.5 text-[11px] font-black uppercase tracking-widest focus:outline-none focus:ring-8 focus:ring-accent/5 focus:border-accent/40 transition-all shadow-sm placeholder:text-slate-300" />
            </div>

            <div class="pagination-container" *ngIf="vm.totalCount > pageSize">
               <div class="flex items-center gap-1 p-1">
                  <button class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-slate-50 transition-all" [disabled]="vm.currentPage === 1" (click)="prevPage()">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <div class="flex items-center gap-1">
                     <div *ngFor="let p of getPageNumbers(vm.totalCount)" (click)="goToPage(p)" class="page-number" [class.active]="p === vm.currentPage">{{ p }}</div>
                  </div>
                  <button class="w-8 h-8 rounded-full flex items-center justify-center text-muted hover:bg-slate-50 transition-all" [disabled]="vm.currentPage * pageSize >= vm.totalCount" (click)="nextPage()">
                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
               </div>
            </div>
          </div>
        </div>

        <!-- Ledger Table -->
        <div class="ledger-table-container">
          <div class="ledger-header">
            <div class="col-span-2">Reference</div>
            <div class="col-span-2">Timestamp</div>
            <div class="col-span-2">Customer / Entity</div>
            <div class="col-span-1 text-center">Items</div>
            <div class="col-span-2 text-right">Settlement</div>
            <div class="col-span-2 text-center">Status</div>
            <div class="col-span-1"></div>
          </div>

          <div *ngIf="vm.loading" class="p-20 space-y-4">
             <div *ngFor="let i of [1,2,3,4,5]" class="h-14 bg-slate-50 rounded-2xl animate-pulse"></div>
          </div>

          <div *ngIf="!vm.loading">
            <div *ngFor="let bill of vm.items" 
                 (click)="selectBill(bill)"
                 class="ledger-row group"
                 [class.selected]="selectedBillId === bill.id">
              
              <div class="col-span-2">
                <span class="text-xs font-black text-primary group-hover:text-accent transition-colors">#{{ bill.billNumber }}</span>
              </div>
              
              <div class="col-span-2">
                <span class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ bill.createdAt | date:'MMM d, HH:mm' }}</span>
              </div>

              <div class="col-span-2 flex items-center gap-3">
                 <div class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-muted uppercase">
                    {{ bill.billNumber.slice(-1) }}
                 </div>
                 <span class="text-[11px] font-black text-primary">Walk-in Customer</span>
              </div>

              <div class="col-span-1 text-center">
                 <span class="chip chip-neutral py-0.5 px-2">{{ bill.items.length }} SKU</span>
              </div>

              <div class="col-span-2 text-right">
                 <span class="text-sm font-black text-primary">₹{{ bill.finalAmount | number:'1.2-2' }}</span>
              </div>

              <div class="col-span-2 text-center flex flex-col items-center gap-1">
                 <span class="pos-badge" [ngClass]="getStatusClass(bill.status)">{{ getStatusText(bill.status) }}</span>
                 <ng-container *ngTemplateOutlet="expiryInfo; context: { bill: bill }"></ng-container>
              </div>

              <div class="col-span-1 text-right pr-4 opacity-0 group-hover:opacity-100 transition-opacity">
                 <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4" class="text-accent ml-auto"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>

            <div *ngIf="vm.items.length === 0 && !vm.error" class="py-24 flex flex-col items-center justify-center text-center">
              <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              </div>
              <h3 class="text-sm font-black text-primary mb-1 uppercase tracking-widest">No matching records</h3>
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">Try adjusting your filters or search term</p>
            </div>
            <div *ngIf="vm.error" class="py-24 flex flex-col items-center justify-center text-center">
              <div class="w-20 h-20 bg-rose-50/50 rounded-[2rem] flex items-center justify-center mb-6 text-rose-300">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 class="text-sm font-black text-rose-500 mb-1 uppercase tracking-widest">Unable to load records</h3>
              <p class="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40 mb-4">There was a problem communicating with the server</p>
              <button (click)="refresh$.next(1)" class="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-primary text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors">Retry</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Detail Drawer Overlay -->
      <div class="detail-drawer-overlay" [class.active]="selectedBillId" (click)="closeDrawer()"></div>

      <!-- Detail Drawer -->
      <div class="detail-drawer" [class.active]="selectedBillId">
        <div class="p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 bg-white z-10">
           <div>
              <h2 class="text-xl font-black text-primary tracking-tighter">Transaction Detail</h2>
              <div class="flex items-center gap-3 mt-1.5">
                 <span class="text-[10px] font-black text-accent uppercase tracking-widest">#{{ selectedBill?.billNumber }}</span>
                 <div class="h-1 w-1 rounded-full bg-slate-200"></div>
                 <span class="text-[10px] font-bold text-muted uppercase tracking-widest">{{ selectedBill?.createdAt | date:'medium' }}</span>
              </div>
           </div>
           <button (click)="closeDrawer()" class="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
           </button>
        </div>

        <div class="flex-1 overflow-y-auto px-10 py-6 custom-scrollbar space-y-2">
           
           <!-- Skeleton Loader -->
           <div *ngIf="drawerLoading" class="space-y-8 animate-pulse">
              <div class="h-24 bg-slate-50 rounded-[2rem]"></div>
              <div class="space-y-4">
                 <div class="h-4 w-24 bg-slate-50"></div>
                 <div class="h-12 bg-slate-50 rounded-xl"></div>
                 <div class="h-12 bg-slate-50 rounded-xl"></div>
              </div>
           </div>

           <ng-container *ngIf="!drawerLoading && selectedBill">
              <!-- Status Banner -->
              <div class="p-6 rounded-[2rem] border mb-8 flex items-center justify-between" [ngClass]="getStatusClass(selectedBill.status)">
                 <div class="flex flex-col gap-1">
                    <span class="text-[10px] font-black uppercase tracking-[0.2em]">Current Lifecycle State</span>
                    <span class="text-lg font-black uppercase tracking-tight">{{ getStatusText(selectedBill.status) }}</span>
                 </div>
                 <div class="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
              </div>

              <!-- Audit Trail -->
              <div class="drawer-section">
                 <h4 class="drawer-label">Audit Trail & Compliance</h4>
                 <div class="audit-timeline" *ngIf="selectedBill.auditTrail.length; else noAudit">
                    <div *ngFor="let step of selectedBill.auditTrail" class="audit-step completed">
                       <span class="step-time">{{ step.timestamp | date:'HH:mm:ss' }}</span>
                       <span class="step-label">{{ step.action }}</span>
                       <span class="step-user">Actor: {{ step.actor }} • Status: {{ step.status }}</span>
                    </div>
                 </div>
                 <ng-template #noAudit>
                    <div class="audit-timeline">
                        <div class="audit-step completed">
                            <span class="step-time">{{ selectedBill.createdAt | date:'HH:mm:ss' }}</span>
                            <span class="step-label">Transaction Initialized</span>
                            <span class="step-user">Operator: {{ selectedBill.userId.slice(0,8) }}</span>
                        </div>
                    </div>
                 </ng-template>
              </div>

              <!-- Refund Eligibility Section (Synced from Details) -->
              <div class="drawer-section" *ngIf="canShowRefundSection()">
                 <h4 class="drawer-label">Refund Eligibility</h4>
                 <div class="flex flex-col gap-3" *ngIf="refundableItems.length > 0">
                    <div *ngFor="let item of refundableItems" class="flex items-center justify-between p-3 bg-blue-50/30 border border-blue-100 rounded-xl">
                       <span class="text-[11px] font-black text-primary">{{ item.productName }}</span>
                       <span class="text-[9px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-md uppercase tracking-tighter">
                          Expires in {{ getItemRemainingTime(item) }}
                       </span>
                    </div>
                    <button (click)="handleAction('refund')" class="pos-btn pos-btn-danger w-full py-3 mt-2 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-50">
                       Initiate Item Refund
                    </button>
                 </div>
                 <div *ngIf="refundableItems.length === 0" class="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">No items eligible for refund</p>
                 </div>
              </div>

              <!-- Items -->
              <div class="drawer-section">
                 <h4 class="drawer-label">Purchased Entities</h4>
                 <div class="space-y-4" *ngIf="selectedBill.items.length; else noItems">
                    <div *ngFor="let item of selectedBill.items" class="flex items-center gap-4 group">
                       <div class="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-accent/5 group-hover:text-accent transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                       </div>
                       <div class="flex-1 min-w-0">
                          <div class="flex justify-between items-start">
                             <div class="flex flex-col">
                                <span class="text-xs font-black text-primary truncate">{{ item.productName }}</span>
                                <span class="text-[9px] font-bold text-muted uppercase tracking-widest">{{ item.quantity }} Units @ ₹{{ item.unitPrice | number:'1.2-2' }}</span>
                             </div>
                             <span class="text-xs font-black text-primary">₹{{ item.totalPrice | number:'1.2-2' }}</span>
                          </div>
                       </div>
                    </div>
                 </div>
                 <ng-template #noItems>
                    <div class="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                       <p class="text-[10px] font-black text-muted uppercase tracking-widest">No items found in this transaction</p>
                    </div>
                 </ng-template>
              </div>

              <!-- Totals -->
              <div class="drawer-section border-none" *ngIf="selectedBill.pricing; else fallbackPricing">
                 <div class="bg-slate-50 rounded-[2rem] p-8 space-y-4">
                    <div class="flex justify-between text-[10px] font-black text-muted uppercase tracking-widest">
                       <span>Subtotal (Excl Tax)</span>
                       <span>₹{{ selectedBill.pricing.subtotal | number:'1.2-2' }}</span>
                    </div>
                    <div class="flex justify-between text-[10px] font-black text-muted uppercase tracking-widest">
                       <span>GST Calculation</span>
                       <span>₹{{ selectedBill.pricing.tax | number:'1.2-2' }}</span>
                    </div>
                    <div *ngIf="selectedBill.pricing.discount" class="flex justify-between text-[10px] font-black text-rose-500 uppercase tracking-widest">
                       <span>Discounts</span>
                       <span>-₹{{ selectedBill.pricing.discount | number:'1.2-2' }}</span>
                    </div>
                    <div class="pt-4 border-t border-slate-200 flex justify-between items-center">
                       <span class="text-xs font-black text-primary uppercase tracking-widest">Final Settlement</span>
                       <span class="text-3xl font-black text-primary tracking-tighter">₹{{ selectedBill.pricing.total | number:'1.2-2' }}</span>
                    </div>
                 </div>
              </div>
              <ng-template #fallbackPricing>
                 <div class="drawer-section border-none">
                    <div class="bg-slate-50 rounded-[2rem] p-8 space-y-4">
                       <div class="flex justify-between text-[10px] font-black text-muted uppercase tracking-widest">
                          <span>Subtotal (Excl Tax)</span>
                          <span>₹{{ selectedBill.totalAmount | number:'1.2-2' }}</span>
                       </div>
                       <div class="flex justify-between text-[10px] font-black text-muted uppercase tracking-widest">
                          <span>GST Calculation</span>
                          <span>₹{{ selectedBill.taxAmount | number:'1.2-2' }}</span>
                       </div>
                       <div class="pt-4 border-t border-slate-200 flex justify-between items-center">
                          <span class="text-xs font-black text-primary uppercase tracking-widest">Final Settlement</span>
                          <span class="text-3xl font-black text-primary tracking-tighter">₹{{ selectedBill.finalAmount | number:'1.2-2' }}</span>
                       </div>
                    </div>
                 </div>
              </ng-template>
           </ng-container>
        </div>

        <!-- Operations Actions -->
        <div class="p-10 border-t border-slate-50 bg-slate-50/30 grid grid-cols-2 gap-4 sticky bottom-0">
           <button *ngIf="canPerform('print')" (click)="handleAction('print')" class="pos-btn pos-btn-secondary py-4 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
              Print Receipt
           </button>
           <button *ngIf="canPerform('print')" (click)="downloadInvoice(selectedBill!)" class="pos-btn pos-btn-secondary py-4 text-[10px] font-black uppercase tracking-widest disabled:opacity-40">
              Download PDF
           </button>
           <button *ngIf="canPerform('print')" (click)="sendEmailReceipt(selectedBill!)" class="pos-btn pos-btn-secondary py-4 text-[10px] font-black uppercase tracking-widest">
              Email Invoice
           </button>
           <button *ngIf="canPerform('resume')" (click)="handleAction('resume')" 
                   [disabled]="selectedBill!.isExpired || isProcessing"
                   class="pos-btn pos-btn-primary py-4 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
              <span *ngIf="!isProcessing">{{ selectedBill!.isExpired ? 'Order Expired' : 'Resume Order' }}</span>
              <span *ngIf="isProcessing">Processing...</span>
           </button>
           <button *ngIf="canPerform('cancel')" (click)="handleAction('cancel')" 
                   [disabled]="isProcessing"
                   class="pos-btn pos-btn-secondary border-rose-100 text-rose-500 py-4 text-[10px] font-black uppercase tracking-widest disabled:opacity-50">
              <span *ngIf="!isProcessing">Void Bill</span>
              <span *ngIf="isProcessing">Processing...</span>
           </button>
        </div>
      </div>

      <!-- Expiry Countdown Display in List -->
      <ng-template #expiryInfo let-bill="bill">
         <div *ngIf="bill.status === 'Suspended' && !bill.isExpired" class="mt-2 flex items-center gap-2">
            <div class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">
               Expires in {{ getRemainingText(bill) }}
            </span>
         </div>
          <div *ngIf="bill.status === 'Suspended' && bill.isExpired" class="mt-2">
             <span class="text-[9px] font-black text-rose-500 uppercase tracking-widest">EXPIRED</span>
          </div>
       </ng-template>
    </div>
  `
})
export class BillsComponent implements OnInit, OnDestroy {
  protected readonly Math = Math;
  private readonly billApi = inject(BillApi);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  public readonly toast = inject(ToastService);
  private readonly billToCart = inject(BillToCartMapper);
  private readonly printService = inject(PrintService);
  private readonly auth = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly modal = inject(ModalService);
  private readonly destroy$ = new Subject<void>();

  protected readonly BillStatus = BillStatus;
  currentTime = Date.now();
  isProcessing = false;

  search = '';
  status: StatusFilter = 'All';
  readonly pageSize = 12;

  selectedBillId: string | null = null;
  selectedBill: BillDto | null = null;
  drawerLoading = false;

  readonly search$ = new BehaviorSubject<string>('');
  readonly status$ = new BehaviorSubject<StatusFilter>('All');
  readonly page$ = new BehaviorSubject<number>(1);
  readonly refresh$ = new BehaviorSubject<number>(0);

  readonly tabs: { id: StatusFilter; label: string }[] = [
    { id: 'All', label: 'All Activity' },
    { id: 'Authorized', label: 'Authorized' },
    { id: 'Suspended', label: 'Suspended' },
    { id: 'Finalized', label: 'Finalized' },
    { id: 'Refunded', label: 'Refunded' },
    { id: 'Cancelled', label: 'Voided' }
  ];

  readonly stats$ = this.refresh$.pipe(
    switchMap(() => {
      if (!this.isBrowser) return of(null);
      return this.billApi.getDashboardSummary().pipe(
        catchError(() => of(null))
      );
    }),
    shareReplay(1)
  );

  readonly vm$ = combineLatest([
    this.search$.pipe(debounceTime(300), distinctUntilChanged(), tap(() => this.page$.next(1))),
    this.status$.pipe(distinctUntilChanged(), tap(() => this.page$.next(1))),
    this.page$.pipe(distinctUntilChanged()),
    this.refresh$
  ]).pipe(
    switchMap(([searchTerm, statusFilter, currentPage]) => {
      if (!this.isBrowser) return of({ items: [], totalCount: 0, currentPage: 1, loading: false, error: false });
      
      const safePage = currentPage || 1;
      const status = statusFilter === 'All' ? undefined : (BillStatus as any)[statusFilter];
      
      return this.billApi.getPaged({ 
        page: safePage, 
        pageSize: this.pageSize,
        status: status,
        search: searchTerm 
      }).pipe(
        map(res => ({
          items: res.items || [],
          totalCount: res.totalCount || 0,
          currentPage: safePage,
          loading: false,
          error: false
        })),
        startWith({ items: [], totalCount: 0, currentPage: safePage, loading: true, error: false }),
        catchError(() => of({ items: [], totalCount: 0, currentPage: safePage, loading: false, error: true }))
      );
    }),
    shareReplay(1)
  );

  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  ngOnInit(): void {
    if (this.isBrowser) {
      interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => this.refresh$.next(Date.now()));
      
      interval(1000).pipe(takeUntil(this.destroy$)).subscribe(() => {
         this.currentTime = Date.now();
         this.cdr.detectChanges();
      });
    }

    // Handle deep-linking
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
       const billId = params.get('billId');
       if (billId) {
          this.loadFullBill(billId);
       }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setStatus(s: StatusFilter): void {
    this.status = s;
    this.status$.next(s);
  }

  selectBill(bill: BillDto): void {
    this.loadFullBill(bill.id);
    // Update URL to support deep-linking
    this.router.navigate(['/pos/bills', bill.id], { replaceUrl: true });
  }

  private loadFullBill(id: string): void {
    this.selectedBillId = id;
    this.drawerLoading = true;
    this.cdr.detectChanges();
    this.billApi.getById(id).subscribe({
       next: (bill) => {
          this.selectedBill = bill;
          this.drawerLoading = false;
          this.cdr.detectChanges();
       },
       error: (err: any) => {
          this.toast.error('Failed to load bill details');
          this.drawerLoading = false;
          this.cdr.detectChanges();
          this.closeDrawer();
       }
    });
  }

  closeDrawer(): void {
    this.selectedBillId = null;
    this.selectedBill = null;
    this.router.navigate(['/pos/bills'], { replaceUrl: true });
    this.cdr.detectChanges();
  }

  canPerform(action: BillAction): boolean {
    if (!this.selectedBill) return false;
    
    // Check for expired suspended bill
    if (this.selectedBill.status === BillStatus.Suspended && this.selectedBill.isExpired) {
       if (action === 'resume') return true; // we show it but disable it
       if (action === 'cancel') return true;
    }

    // Permission check for resume
    if (action === 'resume' && this.selectedBill.status === BillStatus.Suspended) {
       const user = this.auth.identity;
       if (user && user.role !== 'Admin' && this.selectedBill.suspendedBy && this.selectedBill.suspendedBy !== user.userId) {
          return false;
       }
    }

    return canPerformBillAction(this.selectedBill.status, action);
  }

  handleAction(action: BillAction): void {
    if (!this.selectedBill) return;

    if (!this.canPerform(action)) {
       this.toast.error(`Action ${action} is not valid in state ${this.selectedBill.status}`);
       return;
    }

    switch (action) {
       case 'print':
         this.printReceipt(this.selectedBill);
         break;
       case 'resume':
         this.resumeBill(this.selectedBill);
         break;
       case 'refund':
          this.openRefundModal();
          break;
       case 'cancel':
         const reason = window.prompt('Enter reason to void this bill:', '');
         if (reason !== null) {
            this.billApi.cancel(this.selectedBill.id).subscribe({
               next: () => {
                 this.toast.success('Bill voided successfully');
                 this.refresh$.next(Date.now());
                 this.closeDrawer();
               },
               error: (err: any) => this.toast.error(err.error?.message || 'Failed to void bill')
            });
         }
         break;
    }
  }

   resumeBill(bill: BillDto): void {
    if (bill.isExpired) {
       this.toast.error('This transaction has expired and cannot be resumed.');
       return;
    }

    this.isProcessing = true;
    this.cdr.detectChanges();
    this.billApi.resume(bill.id).subscribe({
       next: () => {
          this.billToCart.hydrateCartFromBillDto(bill).subscribe();
          this.toast.success(`Resumed Order #${bill.billNumber}`);
          this.isProcessing = false;
          this.cdr.detectChanges();
          this.router.navigate(['/pos']);
       },
       error: (err: any) => {
          this.isProcessing = false;
          this.toast.error(err.error?.message || 'Failed to resume order');
          this.loadFullBill(bill.id); // Refresh state
          this.cdr.detectChanges();
       }
    });
  }

  getRemainingText(bill: BillDto): string {
    if (!bill.suspendedAt) return '--:--';
    const expiresAt = new Date(bill.suspendedAt).getTime() + (15 * 60 * 1000);
    const seconds = Math.max(0, Math.floor((expiresAt - this.currentTime) / 1000));
    
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  getPageNumbers(totalCount: number): number[] {
    const totalPages = Math.ceil(totalCount / this.pageSize);
    const current = this.page$.value;
    const pages = [];
    for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
       pages.push(i);
    }
    return pages;
  }

  goToPage(p: number): void {
    if (p === this.page$.value) return;
    this.page$.next(p);
  }

  nextPage(): void { this.page$.next(this.page$.value + 1); }
  prevPage(): void { if (this.page$.value > 1) this.page$.next(this.page$.value - 1); }

  sendEmailReceipt(bill: BillDto): void {
    const email = window.prompt('Enter recipient email address:', '');
    if (!email || !email.includes('@')) {
      if (email !== null) this.toast.error('Invalid email address');
      return;
    }

    this.billApi.sendEmailReceipt(bill.id, email).subscribe({
      next: () => this.toast.success(`Receipt dispatched to ${email}`),
      error: (err: any) => this.toast.error(err.error?.message || 'Failed to send email')
    });
  }

  printReceipt(bill: BillDto): void {
    this.billApi.getReceipt(bill.id).subscribe({
      next: (receipt) => this.printService.printThermal(receipt),
      error: () => this.toast.error('Failed to generate receipt data')
    });
  }

  downloadInvoice(bill: BillDto): void {
    this.toast.info('Generating Invoice...');
    this.billApi.getReceipt(bill.id).subscribe({
      next: async (receipt) => {
        try {
          await this.printService.downloadA4Pdf(receipt);
          this.toast.success('Invoice downloaded');
        } catch (err) {
          this.toast.error('Failed to generate PDF');
        }
      },
      error: () => this.toast.error('Failed to fetch receipt data')
    });
  }

  getStatusClass(status: string | BillStatus): string {
    if (this.selectedBill?.status === BillStatus.Suspended && this.selectedBill.isExpired) {
       return 'pos-badge-cancelled text-rose-600 bg-rose-50 border-rose-100';
    }

    switch (status) {
      case BillStatus.Finalized: return 'pos-badge-completed text-emerald-600 bg-emerald-50 border-emerald-100';
      case BillStatus.Authorized: return 'pos-badge-awaiting text-blue-600 bg-blue-50 border-blue-100';
      case BillStatus.Suspended: return 'pos-badge-suspended text-amber-600 bg-amber-50 border-amber-100';
      case BillStatus.Cancelled: return 'pos-badge-cancelled text-rose-600 bg-rose-50 border-rose-100';
      case BillStatus.Expired: return 'pos-badge-cancelled text-rose-600 bg-rose-50 border-rose-100';
      case BillStatus.Refunded: return 'pos-badge-completed text-purple-600 bg-purple-50 border-purple-100';
      case BillStatus.PartialRefund: return 'pos-badge-completed text-indigo-600 bg-indigo-50 border-indigo-100';
      case BillStatus.RefundRequested: return 'pos-badge-awaiting text-amber-600 bg-amber-50 border-amber-100';
      default: return 'pos-badge-ghost text-slate-400 bg-slate-50 border-slate-100';
    }
  }

  getStatusText(status: string | BillStatus): string {
    if (this.selectedBill?.status === BillStatus.Suspended && this.selectedBill.isExpired) {
       return 'EXPIRED';
    }
    if (status === BillStatus.Expired) return 'EXPIRED';
    if (status === BillStatus.PartialRefund) return 'PARTIALLY REFUNDED';
    if (status === BillStatus.RefundRequested) return 'REFUND REQUESTED';
    return BillStatus[status as BillStatus] || status;
  }

  canShowRefundSection(): boolean {
    if (!this.selectedBill) return false;
    const s = (this.selectedBill.status || '').toString().toUpperCase();
    return s === 'FINALIZED' || s === 'PARTIALREFUND' || s === 'REFUNDREQUESTED';
  }

  get isRefundEligible(): boolean {
    if (!this.selectedBill) return false;
    const s = (this.selectedBill.status || '').toString().toUpperCase();
    if (s !== 'FINALIZED' && s !== 'PARTIALREFUND') return false;
    return this.refundableItems.length > 0;
  }

  get refundableItems(): any[] {
    if (!this.selectedBill) return [];
    return this.selectedBill.items.filter(i => i.isRefundEligible);
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

  openRefundModal() { 
    if (this.selectedBill) {
      this.modal.openRefundModal(this.selectedBill);
    }
  }
}
