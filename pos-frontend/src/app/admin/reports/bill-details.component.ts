import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { BillApi, BillDto, BillStatus } from '../../core/bill.api';
import { ReceiptComponent } from '../../pos/receipt/receipt.component';

@Component({
  selector: 'app-admin-bill-details',
  standalone: true,
  imports: [CommonModule, RouterModule, ReceiptComponent],
  template: `
    <div class="max-w-[1000px] mx-auto p-6 lg:p-10 animate-in fade-in duration-700">
      
      <!-- Header -->
      <div class="flex items-center justify-between mb-8">
        <div class="flex items-center gap-4">
          <button (click)="goBack()" class="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary transition-all shadow-sm">
            <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 class="text-2xl font-black text-slate-900 tracking-tighter">Transaction Audit</h2>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Registry Record Analysis</p>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button (click)="print()" class="pos-btn pos-btn-secondary px-6 border-slate-900 bg-slate-900 text-white hover:bg-black no-print">Print Record</button>
        </div>
      </div>

      <div *ngIf="loading()" class="space-y-6">
        <div class="h-40 bg-white border border-slate-100 rounded-[2rem] animate-pulse"></div>
        <div class="h-80 bg-white border border-slate-100 rounded-[2rem] animate-pulse"></div>
      </div>

      <div *ngIf="!loading() && bill()" class="space-y-8 no-print">
        
        <!-- Summary Card -->
        <div class="bg-white border border-slate-100 rounded-[2.5rem] p-8 lg:p-10 shadow-sm relative overflow-hidden">
          <div class="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
             <svg class="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
          </div>

          <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div class="flex items-center gap-6">
              <div class="w-16 h-16 rounded-3xl flex items-center justify-center shadow-sm" [ngClass]="getStatusClass(bill()!.status)">
                <svg *ngIf="bill()!.status === BillStatus.Finalized" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                <svg *ngIf="bill()!.status === BillStatus.Refunded" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 0118 0z" /></svg>
                <svg *ngIf="bill()!.status === BillStatus.Cancelled" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </div>
              <div>
                <div class="flex items-center gap-3">
                  <h3 class="text-xl font-black text-slate-900 tracking-tighter">Bill #{{ bill()!.billNumber }}</h3>
                  <span class="text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-widest border" [ngClass]="getStatusClass(bill()!.status)">{{ bill()!.status }}</span>
                </div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{{ bill()!.createdAt | date:'medium' }}</p>
              </div>
            </div>

            <div class="text-right">
              <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Final Settlement</span>
              <p class="text-3xl font-black text-slate-900 tracking-tighter">₹{{ bill()!.finalAmount | number:'1.2-2' }}</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Items List -->
          <div class="lg:col-span-2 space-y-6">
            <div class="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm">
              <div class="px-8 py-5 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                 <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction Items ({{ bill()!.items.length }})</h4>
              </div>
              <table class="w-full">
                <thead class="bg-slate-50/20 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                  <tr>
                    <th class="px-8 py-4 text-left">Product</th>
                    <th class="px-8 py-4 text-center">Qty</th>
                    <th class="px-8 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-50">
                  <tr *ngFor="let item of bill()!.items" class="hover:bg-slate-50/30 transition-colors">
                    <td class="px-8 py-5">
                      <p class="text-xs font-black text-slate-900">{{ item.productName }}</p>
                      <p *ngIf="item.refundedQuantity > 0" class="text-[8px] font-black text-rose-500 uppercase mt-1">{{ item.refundedQuantity }} Refunded</p>
                    </td>
                    <td class="px-8 py-5 text-center text-xs font-bold text-slate-600">{{ item.quantity }}</td>
                    <td class="px-8 py-5 text-right text-xs font-black text-slate-900">₹{{ item.totalPrice | number:'1.2-2' }}</td>
                  </tr>
                </tbody>
              </table>
              
              <div class="p-8 bg-slate-50/30 flex flex-col items-end gap-3 border-t border-slate-50">
                <div class="flex items-center gap-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Subtotal</span>
                  <span class="text-slate-900 w-24 text-right">₹{{ bill()!.totalAmount | number:'1.2-2' }}</span>
                </div>
                <div class="flex items-center gap-10 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <span>Tax Amount</span>
                  <span class="text-slate-900 w-24 text-right">₹{{ bill()!.taxAmount | number:'1.2-2' }}</span>
                </div>
                <div class="flex items-center gap-10 text-lg font-black text-slate-900 mt-2">
                  <span class="tracking-tighter">Grand Total</span>
                  <span class="text-blue-600 w-32 text-right">₹{{ bill()!.finalAmount | number:'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Audit Trail -->
          <div class="space-y-6">
            <div class="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
              <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <div class="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                Lifecycle Audit
              </h4>
              <div class="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                <div *ngFor="let log of bill()!.auditTrail" class="relative pl-8 group">
                  <div class="absolute left-0 top-1.5 w-[23px] h-[23px] bg-white border-2 border-slate-100 rounded-full flex items-center justify-center z-10 group-last:border-blue-500 transition-colors">
                     <div class="w-1.5 h-1.5 bg-slate-200 rounded-full group-last:bg-blue-500"></div>
                  </div>
                  <div>
                    <p class="text-[10px] font-black text-slate-900 uppercase tracking-tight">{{ log.action }}</p>
                    <p class="text-[8px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{{ log.timestamp | date:'short' }}</p>
                    <p class="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">Operator: {{ log.actor.slice(0,8) }}</p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Receipt Metadata -->
            <div class="bg-slate-900 rounded-[2rem] p-8 text-white space-y-6 shadow-xl">
               <div class="space-y-1">
                  <span class="text-[8px] font-black text-white/40 uppercase tracking-widest">Payment Method</span>
                  <p class="text-xs font-black">{{ bill()!.paymentId ? 'Electronic / Card' : 'Cash / Manual' }}</p>
               </div>
               <div class="space-y-1" *ngIf="bill()!.paymentId">
                  <span class="text-[8px] font-black text-white/40 uppercase tracking-widest">Transaction ID</span>
                  <p class="text-[10px] font-mono text-white/80 break-all">{{ bill()!.paymentId }}</p>
               </div>
               <div class="h-px bg-white/10"></div>
               <p class="text-[8px] font-bold text-white/30 leading-relaxed">This record is a system-generated audit document. For legal disputes, reference the Transaction ID with the payment processor.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Print Layout -->
    <div class="print-root" *ngIf="receiptData()">
       <div class="print-only receipt-container">
          <app-receipt [data]="receiptData()"></app-receipt>
       </div>
    </div>
  `,
  styles: [`
    :host { display: block; background-color: #f8fafc; min-height: 100vh; }
    
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        visibility: hidden;
        background: white !important;
      }
      .print-root, .print-root * {
        visibility: visible;
      }
      .print-root {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        display: block !important;
      }
      .receipt-container {
        display: flex !important;
        justify-content: center;
        width: 100%;
      }
      .no-print { display: none !important; }
    }
  `]
})
export class AdminBillDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly billApi = inject(BillApi);
  private readonly router = inject(Router);

  loading = signal(true);
  bill = signal<BillDto | null>(null);
  receiptData = signal<any | null>(null);
  BillStatus = BillStatus;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadBill(id);
    } else {
      this.goBack();
    }
  }

  loadBill(id: string) {
    this.loading.set(true);
    this.billApi.getById(id).subscribe({
      next: (res) => {
        this.bill.set(res);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        // If not found, the router will handle it or we could show an error
      }
    });
  }

  goBack() {
    // Try to go back to previous context if possible
    window.history.back();
  }

  print() {
    if (!this.bill()) return;
    
    this.billApi.getReceipt(this.bill()!.id).subscribe(res => {
      this.receiptData.set(res);
      setTimeout(() => {
        window.print();
        this.receiptData.set(null);
      }, 100);
    });
  }

  getStatusClass(status: BillStatus): string {
    switch (status) {
      case BillStatus.Finalized: return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case BillStatus.Refunded: return 'bg-rose-50 text-rose-600 border-rose-100';
      case BillStatus.Cancelled: return 'bg-slate-50 text-slate-400 border-slate-100';
      case BillStatus.PartialRefund: return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-blue-50 text-blue-600 border-blue-100';
    }
  }
}
