import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BillApi, RefundStatus } from '../../core/bill.api';
import { ToastService } from '../../core/toast.service';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-refunds',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-[1400px] mx-auto p-10 lg:p-12 space-y-10">
      <div class="flex items-center justify-between mb-10">
        <div>
          <h1 class="text-3xl font-black text-primary tracking-tighter">Refund <span class="text-accent">Console</span></h1>
          <p class="text-[10px] font-black text-muted uppercase tracking-[0.3em] mt-2">Administrative approval & settlement queue</p>
        </div>
        <button (click)="load()" class="pos-btn pos-btn-secondary px-8">Refresh Queue</button>
      </div>

      <div class="bg-white border border-slate-50 rounded-[2.5rem] shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left">
            <thead>
              <tr class="text-[9px] font-black text-muted uppercase tracking-[0.2em] border-b border-slate-50 bg-slate-50/30">
                <th class="p-8">Reference</th>
                <th class="p-8">Store</th>
                <th class="p-8">Reason</th>
                <th class="p-8 text-right">Refund Amount</th>
                <th class="p-8 text-center">Status</th>
                <th class="p-8">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngFor="let req of requests" class="group hover:bg-slate-50/50 transition-colors">
                <td class="p-8">
                  <div class="flex flex-col">
                    <span class="text-sm font-black text-primary group-hover:text-accent transition-colors">#{{ req.billNumber }}</span>
                    <span class="text-[9px] font-bold text-muted uppercase tracking-widest mt-1">{{ req.id.split('-')[0] }}</span>
                  </div>
                </td>
                <td class="p-8">
                  <div class="space-y-1">
                    <div *ngFor="let item of req.items" class="flex items-center gap-2">
                       <span class="text-xs font-bold text-primary">{{ item.productName }}</span>
                       <span class="text-[10px] font-black text-muted px-2 py-0.5 bg-slate-100 rounded-md">x{{ item.quantity }}</span>
                    </div>
                  </div>
                </td>
                <td class="p-8">
                  <p class="text-xs font-medium text-secondary italic">"{{ req.reason }}"</p>
                  <p class="text-[10px] font-bold text-muted mt-2 uppercase tracking-widest">{{ req.createdAt | date:'medium' }}</p>
                </td>
                <td class="p-8 text-right">
                  <span class="text-sm font-black text-primary">₹{{ req.totalRefundAmount | number:'1.2-2' }}</span>
                </td>
                <td class="p-8 text-center">
                  <span class="pos-badge" [ngClass]="getStatusClass(req.status)">{{ req.status }}</span>
                </td>
                <td class="p-8">
                  <div class="flex items-center gap-2" *ngIf="req.status === 'REQUESTED'">
                    <button (click)="approve(req.id)" class="px-4 py-2 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">Approve</button>
                    <button (click)="reject(req.id)" class="px-4 py-2 bg-rose-50 text-rose-500 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-100 transition-all">Reject</button>
                  </div>
                  <div class="flex items-center gap-2" *ngIf="req.status === 'APPROVED'">
                    <button (click)="settle(req.id)" class="px-6 py-2 bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100">Settle & Close</button>
                  </div>
                  <div *ngIf="req.status === 'SETTLED' || req.status === 'REJECTED'">
                    <span class="text-[9px] font-black text-muted uppercase tracking-widest opacity-40">Processed</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div *ngIf="requests.length === 0" class="py-32 flex flex-col items-center justify-center text-center">
            <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-200">
               <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <h3 class="text-sm font-black text-primary mb-1 uppercase tracking-widest">Refund queue is empty</h3>
            <p class="text-[10px] font-bold text-muted uppercase tracking-widest opacity-40">New refund requests will appear here for review</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background-color: var(--bg-primary); min-height: 100vh; }
  `]
})
export class RefundsComponent implements OnInit {
  private readonly billApi = inject(BillApi);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);

  requests: any[] = [];
  busy = false;

  ngOnInit() {
    this.load();
  }

  load() {
    this.billApi.getRefundRequests().subscribe({
      next: (res) => this.requests = res,
      error: () => this.toast.error('Failed to load refund queue')
    });
  }

  approve(id: string) {
    if (!confirm('Are you sure you want to approve this refund? Stock will be restored upon approval.')) return;
    this.billApi.approveRefundV2(id).subscribe({
      next: () => {
        this.toast.success('Refund request approved and items restocked');
        this.load();
      },
      error: (err: any) => this.toast.error(err.error?.message || 'Approval failed')
    });
  }

  reject(id: string) {
    const reason = window.prompt('Reason for rejection:', 'Policy Violation');
    if (reason === null) return;
    
    this.billApi.rejectRefundV2(id, reason).subscribe({
      next: () => {
        this.toast.success('Refund request rejected');
        this.load();
      },
      error: (err: any) => this.toast.error(err.error?.message || 'Rejection failed')
    });
  }

  settle(id: string) {
    if (!confirm('Are you sure you want to settle this refund? This will finalize the transaction record.')) return;
    this.billApi.settleRefundV2(id).subscribe({
      next: () => {
        this.toast.success('Refund record settled and closed');
        this.load();
      },
      error: (err: any) => this.toast.error(err.error?.message || 'Settlement failed')
    });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'REQUESTED': return 'pos-badge-awaiting text-amber-600 bg-amber-50 border-amber-100';
      case 'APPROVED': return 'pos-badge-completed text-emerald-600 bg-emerald-50 border-emerald-100';
      case 'SETTLED': return 'pos-badge-completed text-indigo-600 bg-indigo-50 border-indigo-100';
      case 'REJECTED': return 'pos-badge-cancelled text-rose-600 bg-rose-50 border-rose-100';
      default: return 'pos-badge-ghost text-slate-400 bg-slate-50 border-slate-100';
    }
  }
}
