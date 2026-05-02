import { Component, OnInit, inject, signal, ChangeDetectorRef, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillApi, RefundRequestDto, RefundStatus, BillDto } from '../../core/bill.api';
import { ReceiptComponent } from '../../pos/receipt/receipt.component';
import { Subject, debounceTime, distinctUntilChanged, Subscription, timer } from 'rxjs';

@Component({
  selector: 'app-refund-requests',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReceiptComponent],
  styles: [`
    :host { display: block; background-color: #f8fafc; min-height: 100vh; }
    .status-badge { @apply px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm transition-all; }
    .list-container { height: calc(100vh - 280px); }
    .detail-container { height: calc(100vh - 180px); }
    .pos-card-mini { @apply bg-white border border-slate-100 p-5 rounded-2xl cursor-pointer transition-all hover:border-blue-200 hover:shadow-md; }
    .pos-card-mini.active { @apply border-blue-500 bg-blue-50/30 shadow-lg ring-1 ring-blue-500/20; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
    
    @media print {
      .no-print { display: none !important; }
      .print-only { display: block !important; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: white; z-index: 9999; }
      body { visibility: hidden; }
      .print-only, .print-only * { visibility: visible; }
    }
  `],
  template: `
    <div class="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8 animate-in fade-in duration-700 no-print">
      
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 class="text-3xl font-black text-slate-900 tracking-tighter">Refund Operations</h2>
          <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Hybrid Financial Control & Audit</p>
        </div>
        <div class="flex items-center gap-4">
          <button (click)="loadRefundRequests()" class="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm group">
            <svg class="w-5 h-5 group-hover:rotate-180 transition-transform duration-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Filters & Stats -->
      <div class="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm">
        <div class="flex items-center gap-2 p-1 bg-slate-100/50 rounded-xl w-fit">
          <button *ngFor="let t of tabs" 
                  (click)="onTabChange(t.value)"
                  [class]="currentTab() === t.value ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50' : 'text-slate-400 hover:text-primary'"
                  class="px-5 py-2 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all">{{ t.label }}</button>
        </div>

        <div class="relative min-w-[320px] group">
          <svg class="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input type="text" [(ngModel)]="search" (ngModelChange)="onSearchChange($event)"
                 placeholder="Search Bill #..." 
                 class="w-full bg-slate-50/50 border-transparent rounded-xl py-3 pl-11 pr-4 text-[11px] font-black focus:bg-white focus:ring-0 focus:border-slate-200 transition-all placeholder:text-slate-300" />
        </div>
      </div>

      <!-- Main Layout -->
      <div class="grid grid-cols-12 gap-8 items-start">
        
        <!-- List Panel (30%) -->
        <div class="col-span-12 lg:col-span-4 xl:col-span-3 space-y-4">
          <div class="flex items-center justify-between px-2">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Incoming Requests ({{ requests().length }})</h3>
          </div>
          
          <div class="list-container overflow-y-auto pr-2 custom-scrollbar space-y-3">
            <div *ngIf="isLoading()" class="space-y-3">
               <div *ngFor="let i of [1,2,3,4,5]" class="h-24 bg-white border border-slate-50 rounded-2xl animate-pulse"></div>
            </div>

            <div *ngIf="!isLoading() && requests().length === 0" class="p-12 text-center bg-white border border-dashed border-slate-200 rounded-[2rem]">
               <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
               </div>
               <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Clear</p>
            </div>

            <div *ngFor="let r of requests()" 
                 (click)="selectRequest(r)"
                 class="pos-card-mini relative overflow-hidden"
                 [class.active]="selectedRequest()?.id === r.id">
              <div class="flex items-start justify-between mb-3">
                <span class="text-xs font-black text-slate-900 group-hover:text-primary transition-colors">#{{ r.billNumber }}</span>
                <span [ngClass]="getStatusPillClass(r.status)" class="status-badge">{{ r.status }}</span>
              </div>
              <div class="flex items-end justify-between">
                <div>
                  <p class="text-[14px] font-black text-slate-900">₹{{ r.totalRefundAmount | number:'1.2-2' }}</p>
                  <p class="text-[9px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{{ r.createdAt | date:'MMM d, HH:mm' }}</p>
                </div>
                <div class="text-right">
                  <span class="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{{ r.items.length }} Items</span>
                </div>
              </div>
              <!-- Progress indicator if processing -->
              <div *ngIf="processingMap[r.id]" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                 <div class="w-5 h-5 border-2 border-slate-200 border-t-primary rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Panel (70%) -->
        <div class="col-span-12 lg:col-span-8 xl:col-span-9">
          <div *ngIf="!selectedRequest()" class="detail-container flex flex-col items-center justify-center bg-white border border-slate-100 rounded-[3rem] shadow-sm animate-in fade-in zoom-in-95 duration-500">
             <div class="w-32 h-32 bg-slate-50 rounded-[3rem] flex items-center justify-center mb-6 text-slate-100">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
             </div>
             <h3 class="text-lg font-black text-slate-900 uppercase tracking-widest mb-1">Audit Desk</h3>
             <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Select a refund request to initiate decision workflow</p>
          </div>

          <div *ngIf="selectedRequest() as r" class="detail-container flex flex-col bg-white border border-slate-100 rounded-[3rem] shadow-xl overflow-hidden animate-in slide-in-from-right-8 duration-500">
            <!-- Detail Header -->
            <div class="p-8 lg:p-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
               <div class="flex items-center gap-6">
                 <div class="w-16 h-16 bg-white border border-slate-100 rounded-3xl flex items-center justify-center shadow-sm">
                    <svg *ngIf="r.status === RefundStatus.Requested" class="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <svg *ngIf="r.status === RefundStatus.Approved" class="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <svg *ngIf="r.status === RefundStatus.Settled" class="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <svg *ngIf="r.status === RefundStatus.Rejected" class="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                 </div>
                 <div>
                    <div class="flex items-center gap-3">
                       <h2 class="text-2xl font-black text-slate-900 tracking-tighter">Bill #{{ r.billNumber }}</h2>
                       <span [ngClass]="getStatusPillClass(r.status)" class="status-badge px-4 py-1.5 text-[9px]">{{ r.status }}</span>
                    </div>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Request ID: {{ r.id.slice(0,18) }}...</p>
                 </div>
               </div>
                <div class="flex flex-col items-end gap-1">
                   <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Refund Impact</span>
                   <div class="flex items-center gap-3">
                      <p class="text-3xl font-black text-rose-600 tracking-tighter">₹{{ r.totalRefundAmount | number:'1.2-2' }}</p>
                      <svg class="w-6 h-6 text-rose-500 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                   </div>
                   <p class="text-[8px] font-bold text-rose-400 uppercase tracking-tighter">Amount returned to customer</p>
                </div>
            </div>

            <!-- Detail Content -->
            <div class="flex-1 overflow-y-auto p-8 lg:p-10 custom-scrollbar space-y-10">
               
               <!-- Metadata Grid -->
               <div class="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div class="space-y-1">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Store Entity</span>
                     <p class="text-xs font-black text-slate-900">{{ r.storeName }}</p>
                  </div>
                  <div class="space-y-1">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Initiated By</span>
                     <p class="text-xs font-black text-slate-900">{{ r.requestedByName || 'System Operator' }}</p>
                     <p class="text-[8px] font-bold text-slate-400 truncate">{{ r.requestedByEmail || 'audit-trail@retailpos.com' }}</p>
                  </div>
                  <div class="space-y-1">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Submission Date</span>
                     <p class="text-xs font-black text-slate-900">{{ r.createdAt | date:'medium' }}</p>
                  </div>
                  <div class="space-y-1">
                     <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Original Bill</span>
                     <p (click)="viewTransaction(r.billId)" class="text-xs font-black text-blue-600 hover:underline cursor-pointer flex items-center gap-1">
                        View Transaction
                        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     </p>
                     <div *ngIf="isBillLoading()" class="h-4 w-20 bg-slate-100 animate-pulse rounded mt-1"></div>
                     <div *ngIf="selectedBill() as bill" class="mt-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100/50 animate-in fade-in slide-in-from-top-2 duration-300">
                        <p class="text-[10px] font-black text-blue-900 tracking-tighter">Amount: ₹{{ bill.finalAmount | number:'1.2-2' }}</p>
                        <p class="text-[8px] font-bold text-blue-400 uppercase tracking-tighter mt-0.5">Finalized {{ bill.completedAt | date:'short' }}</p>
                     </div>
                  </div>
               </div>

               <!-- Items List -->
               <div class="space-y-5">
                  <div class="flex items-center gap-3">
                     <div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                     <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Claimed Items ({{ r.items.length }})</h4>
                  </div>
                  <div class="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm">
                     <table class="w-full">
                        <thead class="bg-slate-50/50 border-b border-slate-100">
                           <tr class="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <th class="px-6 py-4 text-left">Product / SKU</th>
                              <th class="px-6 py-4 text-center">Qty</th>
                              <th class="px-6 py-4 text-right">Refund Amount</th>
                           </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                           <tr *ngFor="let item of r.items" class="hover:bg-slate-50/30 transition-colors">
                              <td class="px-6 py-4 text-xs font-black text-slate-900">{{ item.productName }}</td>
                              <td class="px-6 py-4 text-center text-xs font-black text-slate-600">{{ item.quantity }}</td>
                              <td class="px-6 py-4 text-right text-xs font-black text-slate-900">₹{{ item.refundAmount | number:'1.2-2' }}</td>
                           </tr>
                        </tbody>
                     </table>
                  </div>
               </div>

               <!-- Reason & Context -->
               <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div class="space-y-4">
                     <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                        <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Operator Justification</h4>
                     </div>
                     <div class="bg-amber-50/30 border border-amber-100 p-6 rounded-[2rem]">
                        <p class="text-xs font-bold text-amber-900/80 leading-relaxed italic">"{{ r.reason || 'No specific justification provided by operator.' }}"</p>
                     </div>
                  </div>

                  <!-- Financial Summary -->
                  <div class="space-y-4">
                     <div class="flex items-center gap-3">
                        <div class="w-1.5 h-1.5 bg-slate-900 rounded-full"></div>
                        <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Financial Settlement</h4>
                     </div>
                     <div class="bg-slate-900 p-8 rounded-[2rem] space-y-4 shadow-xl">
                        <div class="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           <span>Subtotal Reversal</span>
                           <span class="text-white">₹{{ r.totalRefundAmount | number:'1.2-2' }}</span>
                        </div>
                        <div class="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                           <span>Tax Impact</span>
                           <span class="text-white">₹0.00</span>
                        </div>
                        <div class="h-px bg-white/10 my-2"></div>
                        <div class="flex justify-between items-center">
                           <span class="text-[11px] font-black text-white uppercase tracking-[0.2em]">Final Refund</span>
                           <span class="text-2xl font-black text-white tracking-tighter">₹{{ r.totalRefundAmount | number:'1.2-2' }}</span>
                        </div>
                     </div>
                  </div>
               </div>

               <!-- Admin Feedback if already handled -->
               <div *ngIf="r.adminNotes" class="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div class="flex items-center gap-3 mb-4">
                     <div class="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
                     <h4 class="text-[10px] font-black text-slate-900 uppercase tracking-widest">Administrative Feedback</h4>
                  </div>
                  <div class="bg-rose-50 border border-rose-100 p-6 rounded-[2rem]">
                     <p class="text-xs font-black text-rose-900 leading-relaxed">"{{ r.adminNotes }}"</p>
                  </div>
               </div>
            </div>

            <!-- Sticky Action Bar -->
            <div class="p-8 border-t border-slate-50 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)] flex items-center justify-between relative z-10">
               <div class="flex items-center gap-4">
                  <button (click)="selectedRequest.set(null)" class="pos-btn pos-btn-secondary px-8 border-slate-200">Cancel View</button>
                  <button *ngIf="r.status === RefundStatus.Settled" (click)="printRefundReceipt(r)" class="pos-btn pos-btn-secondary px-8 border-slate-900 bg-slate-900 text-white hover:bg-black">Print Voucher</button>
               </div>
               
               <div *ngIf="r.status === RefundStatus.Requested" class="flex items-center gap-4">
                  <button (click)="reject(r)" [disabled]="processingMap[r.id]" class="pos-btn pos-btn-secondary px-8 text-rose-600 border-rose-100 hover:bg-rose-50">Reject Request</button>
                  <button (click)="approve(r)" [disabled]="processingMap[r.id]" class="pos-btn pos-btn-primary px-12 bg-blue-600 border-blue-600 shadow-lg shadow-blue-100">Approve Refund</button>
               </div>

               <div *ngIf="r.status === RefundStatus.Approved" class="flex items-center gap-4">
                  <button (click)="reject(r)" [disabled]="processingMap[r.id]" class="pos-btn pos-btn-secondary px-8 text-rose-600 border-rose-100 hover:bg-rose-50">Revoke Approval</button>
                  <button (click)="settle(r)" [disabled]="processingMap[r.id]" class="pos-btn pos-btn-primary px-12 bg-emerald-600 border-emerald-600 shadow-lg shadow-emerald-100">Settle & Close Case</button>
               </div>

               <div *ngIf="r.status === RefundStatus.Rejected" class="flex items-center gap-4 opacity-50">
                  <p class="text-[10px] font-black text-rose-500 uppercase tracking-widest">Case Rejected - No further actions available</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Voucher Print Layout -->
    <div class="print-root" *ngIf="receiptData">
       <div class="print-only receipt-container">
          <app-receipt [data]="receiptData"></app-receipt>
       </div>
    </div>
  `
})
export class RefundRequestsComponent implements OnInit, OnDestroy {
  private readonly billApi = inject(BillApi);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  RefundStatus = RefundStatus;
  
  isLoading = signal(true);
  isBillLoading = signal(false);
  allRequests = signal<RefundRequestDto[]>([]);
  requests = signal<RefundRequestDto[]>([]);
  selectedRequest = signal<RefundRequestDto | null>(null);
  selectedBill = signal<BillDto | null>(null);
  currentTab = signal<RefundStatus | undefined>(undefined);
  search = '';
  private searchSubject = new Subject<string>();
  private pollSub?: Subscription;
  receiptData: any | null = null;

  processingMap: Record<string, boolean> = {};

  readonly tabs = [
    { label: 'All Cases', value: undefined },
    { label: 'Pending', value: RefundStatus.Requested },
    { label: 'Approved', value: RefundStatus.Approved },
    { label: 'Settled', value: RefundStatus.Settled },
    { label: 'Rejected', value: RefundStatus.Rejected }
  ];

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadRefundRequests();
      
      this.searchSubject.pipe(
        debounceTime(300),
        distinctUntilChanged()
      ).subscribe(() => {
        this.applyFilter(this.currentTab());
      });

      this.pollSub = timer(30000, 30000).subscribe(() => {
        this.loadRefundRequests(false);
      });
    } else {
      this.isLoading.set(false);
    }
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  onSearchChange(term: string) {
    this.searchSubject.next(term);
  }

  loadRefundRequests(showLoader = true) {
    if (showLoader) this.isLoading.set(true);
    this.billApi.getRefundRequests().subscribe({
      next: (res) => {
        this.allRequests.set(res || []);
        this.applyFilter(this.currentTab());
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading.set(false);
        this.cdr.detectChanges();
      }
    });
  }

  selectRequest(req: RefundRequestDto) {
    this.selectedRequest.set(req);
    this.selectedBill.set(null);
    this.isBillLoading.set(true);
    
    this.billApi.getById(req.billId).subscribe({
      next: (bill) => {
        this.selectedBill.set(bill);
        this.isBillLoading.set(false);
        this.cdr.detectChanges();
      },
      error: () => {
        this.isBillLoading.set(false);
        this.cdr.detectChanges();
      }
    });
    this.cdr.detectChanges();
  }

  viewTransaction(billId: string) {
    this.router.navigate(['/admin/bills', billId]);
  }

  onTabChange(tab: RefundStatus | undefined) {
    this.currentTab.set(tab);
    this.applyFilter(tab);
    // Clear selection if not in filtered list
    if (this.selectedRequest() && !this.requests().find(r => r.id === this.selectedRequest()?.id)) {
       this.selectedRequest.set(null);
    }
  }

  private applyFilter(status: RefundStatus | undefined) {
    let filtered = [...this.allRequests()];
    
    if (status !== undefined) {
      filtered = filtered.filter(r => r.status === status);
    }

    if (this.search?.trim()) {
      const term = this.search.toLowerCase();
      filtered = filtered.filter(r => 
        r.billNumber.toLowerCase().includes(term)
      );
    }

    this.requests.set(filtered);
  }

  approve(record: RefundRequestDto) {
    const msg = `Approve Refund Request #${record.billNumber}?\n\nIMPORTANT: Approval moves this request to the next stage where financial settlement will occur.`;
    if (!confirm(msg)) return;
    
    this.processingMap[record.id] = true;
    this.billApi.approveRefundV2(record.id).subscribe({
      next: (updated) => {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Request APPROVED' }));
        this.loadRefundRequests(false);
        this.selectedRequest.set(updated);
        delete this.processingMap[record.id];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        delete this.processingMap[record.id];
        window.dispatchEvent(new CustomEvent('show-toast', { detail: err.error?.message || 'Approval failed' }));
        this.cdr.detectChanges();
      }
    });
  }

  reject(record: RefundRequestDto) {
    const reason = prompt('AUDIT LOG: Please provide a specific reason for rejection:');
    if (reason === null) return;
    if (!reason.trim()) {
       alert('Rejection reason is mandatory for compliance.');
       return;
    }

    this.processingMap[record.id] = true;
    this.billApi.rejectRefundV2(record.id, reason).subscribe({
      next: (updated) => {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Request REJECTED' }));
        this.loadRefundRequests(false);
        this.selectedRequest.set(updated);
        delete this.processingMap[record.id];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        delete this.processingMap[record.id];
        window.dispatchEvent(new CustomEvent('show-toast', { detail: err.error?.message || 'Rejection failed' }));
        this.cdr.detectChanges();
      }
    });
  }

  settle(record: RefundRequestDto) {
    const msg = `Settle Refund #${record.billNumber}?\n\nWARNING: This action is IRREVERSIBLE. It will:\n1. Finalize financial reversal\n2. Restore inventory stock counts\n3. Mark case as SETTLED.`;
    if (!confirm(msg)) return;

    this.processingMap[record.id] = true;
    this.billApi.settleRefundV2(record.id).subscribe({
      next: (updated) => {
        window.dispatchEvent(new CustomEvent('show-toast', { detail: 'Refund SETTLED. Stock restored.' }));
        this.loadRefundRequests(false);
        this.selectedRequest.set(updated);
        delete this.processingMap[record.id];
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        delete this.processingMap[record.id];
        window.dispatchEvent(new CustomEvent('show-toast', { detail: err.error?.message || 'Settlement failed' }));
        this.cdr.detectChanges();
      }
    });
  }

  printRefundReceipt(record: RefundRequestDto) {
    this.receiptData = {
      isRefund: true,
      storeName: record.storeName.toUpperCase(),
      storeAddress: 'Main Terminal',
      billNumber: record.billNumber,
      date: record.createdAt,
      paymentMethod: 'REFUND VOUCHER',
      paymentId: record.id.toString().substring(0, 8).toUpperCase(),
      reason: record.reason,
      items: record.items.map(i => ({
        name: i.productName,
        quantity: i.quantity,
        totalPrice: i.refundAmount
      })),
      total: record.totalRefundAmount
    };

    this.cdr.detectChanges();
    setTimeout(() => {
       window.print();
       this.receiptData = null;
       this.cdr.detectChanges();
    }, 150);
  }

  getStatusPillClass(status: RefundStatus): string {
    switch (status) {
      case RefundStatus.Requested: return 'bg-amber-50 text-amber-600 border-amber-100';
      case RefundStatus.Approved: return 'bg-blue-50 text-blue-600 border-blue-100';
      case RefundStatus.Settled: return 'bg-emerald-50 text-emerald-600 border-emerald-100 shadow-emerald-50';
      case RefundStatus.Rejected: return 'bg-rose-50 text-rose-500 border-rose-100';
      default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
  }
}
