import { Component, Input, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BillApi, BillDto } from '../../core/bill.api';
import { ModalService } from '../../core/modal.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-refund-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="refund-modal-container flex flex-col h-full max-h-[85vh]">
      <!-- Header -->
      <header class="flex items-center justify-between p-6 border-b border-slate-50 bg-white sticky top-0 z-10">
        <div>
          <h2 class="text-xl font-black text-primary tracking-tight">Initiate Refund</h2>
          <p class="text-xs text-muted font-bold uppercase tracking-widest mt-1">Select items and quantity to refund</p>
        </div>
        <button (click)="close()" class="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-primary transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>

      <!-- Body -->
      <div class="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
        <div *ngIf="refundableItems.length === 0" class="py-12 text-center">
          <p class="text-sm font-bold text-muted uppercase tracking-widest">No items eligible for refund</p>
        </div>

        <div *ngFor="let item of refundableItems" 
             class="p-5 rounded-3xl border transition-all flex items-center justify-between gap-6"
             [ngClass]="selectedQuantities[item.id] > 0 ? 'bg-red-50/40 border-red-100 ring-4 ring-red-50/20' : 'bg-slate-50/30 border-slate-50'">
          
          <div class="flex-1 min-w-0">
             <div class="flex items-center gap-3 mb-1">
                <span class="text-sm font-black text-primary truncate">{{ item.productName }}</span>
                <span class="px-2 py-0.5 bg-white border border-slate-100 rounded text-[9px] font-black text-muted">₹{{ item.unitPrice | number:'1.2-2' }}</span>
             </div>
             <div class="flex items-center gap-3">
                <span class="text-[10px] font-bold text-muted uppercase tracking-tighter">{{ item.quantity - item.refundedQuantity }} available</span>
                <div class="h-1 w-1 rounded-full bg-slate-200"></div>
                <span class="text-[10px] font-black text-red-500 uppercase tracking-tighter">Expires in {{ getItemRemainingTime(item) }}</span>
             </div>
          </div>

          <div class="flex items-center gap-4">
             <div class="flex items-center bg-white border border-slate-100 rounded-2xl p-1 shadow-sm">
                <button (click)="adjustQty(item, -1)" 
                        [disabled]="(selectedQuantities[item.id] || 0) <= 0"
                        class="w-10 h-10 rounded-xl flex items-center justify-center text-primary font-black hover:bg-slate-50 disabled:opacity-20 transition-all active:scale-90">-</button>
                <span class="w-10 text-center text-sm font-black text-primary">{{ selectedQuantities[item.id] || 0 }}</span>
                <button (click)="adjustQty(item, 1)" 
                        [disabled]="(selectedQuantities[item.id] || 0) >= (item.quantity - item.refundedQuantity)"
                        class="w-10 h-10 rounded-xl flex items-center justify-center text-primary font-black hover:bg-slate-50 disabled:opacity-20 transition-all active:scale-90">+</button>
             </div>
          </div>
        </div>

        <!-- Reason -->
        <div class="pt-4">
           <label class="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-3 block ml-2">Reason for Return</label>
           <textarea [(ngModel)]="reason" 
                     rows="3" 
                     placeholder="e.g. Damaged during transit, Incorrect item received..."
                     class="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-primary text-sm focus:ring-4 focus:ring-accent/10 focus:border-accent/40 outline-none transition-all resize-none shadow-inner"></textarea>
        </div>
      </div>

      <!-- Footer -->
      <footer class="p-6 border-t border-slate-50 bg-slate-50/50 flex gap-4">
        <button (click)="close()" class="flex-1 pos-btn pos-btn-secondary py-4 uppercase tracking-widest text-[10px] font-black">Cancel</button>
        <button (click)="submit()" 
                [disabled]="busy || !hasSelection()" 
                class="flex-2 px-12 pos-btn pos-btn-danger py-4 uppercase tracking-widest text-[10px] font-black shadow-xl shadow-red-100">
          {{ busy ? 'Processing...' : 'Confirm Refund' }}
        </button>
      </footer>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .flex-2 { flex: 2; }
  `]
})
export class RefundModalComponent implements OnInit, OnDestroy {
  @Input() bill!: BillDto;
  
  private readonly billApi = inject(BillApi);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  
  reason = '';
  selectedQuantities: { [key: string]: number } = {};
  busy = false;
  currentTime = Date.now();
  private timerId: any;

  ngOnInit() {
    this.timerId = setInterval(() => {
      this.currentTime = Date.now();
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerId) clearInterval(this.timerId);
  }

  get refundableItems() {
    return this.bill?.items.filter(i => i.isRefundEligible) || [];
  }

  adjustQty(item: any, delta: number) {
    const current = this.selectedQuantities[item.id] || 0;
    const max = item.quantity - item.refundedQuantity;
    const next = Math.max(0, Math.min(max, current + delta));
    this.selectedQuantities[item.id] = next;
  }

  hasSelection() {
    return Object.values(this.selectedQuantities).some(q => q > 0);
  }

  getItemRemainingTime(item: any): string {
    if (!item.refundDeadline) return '--:--';
    const deadline = new Date(item.refundDeadline).getTime();
    const remainingMs = deadline - this.currentTime;
    
    if (remainingMs <= 0) return 'EXPIRED';

    const h = Math.floor(remainingMs / (1000 * 60 * 60));
    const m = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((remainingMs % (1000 * 60)) / 1000);
    
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
  }

  close() {
    this.modal.close();
  }

  submit() {
    if (!this.hasSelection()) return;

    const items = Object.entries(this.selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = this.bill.items.find(i => i.id === id);
        return { productId: item?.productId || '', quantity: qty };
      });

    this.busy = true;
    this.billApi.requestRefund({
      billId: this.bill.id,
      reason: this.reason,
      items: items
    }).subscribe({
      next: () => {
        this.busy = false;
        this.toast.success('Refund request submitted successfully');
        this.modal.close();
        // The calling component should ideally refresh the bill
      },
      error: (err: any) => {
        this.busy = false;
        this.toast.error(err.error?.message || 'Failed to submit refund request');
        this.cdr.detectChanges();
      }
    });
  }
}
