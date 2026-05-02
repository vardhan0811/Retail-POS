import { Component, OnInit, inject, signal } from '@angular/core';
import { NgIf, NgFor, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminStoresService } from './stores.service';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-admin-stores',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="max-w-[1500px] mx-auto p-8 lg:p-14 space-y-10 animate-in fade-in duration-700">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-6">
        <div>
          <h2 class="text-4xl font-black text-primary tracking-tighter">Store Management</h2>
          <p class="text-sm font-bold text-muted uppercase tracking-[0.2em] mt-3 opacity-60">Manage your retail network & locations</p>
        </div>
        <button 
          class="pos-btn"
          [class.pos-btn-secondary]="creating"
          [class.pos-btn-primary]="!creating"
          (click)="creating = !creating"
        >
          <span class="flex items-center gap-2">
            <svg *ngIf="!creating" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
            <svg *ngIf="creating" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
            {{ creating ? 'Close Panel' : 'Registration' }}
          </span>
        </button>
      </div>

      <!-- Create Store Form -->
      <div *ngIf="creating" class="pos-card p-10 mb-10 border border-slate-50 max-w-4xl animate-in slide-in-from-top-4 duration-500">
        <h3 class="text-xl font-black text-primary tracking-tight mb-8">Register New Node</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Store Identity</label>
            <input type="text" [(ngModel)]="createName" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" placeholder="e.g. Nexus Prime" />
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Region/Sector</label>
            <input type="text" [(ngModel)]="createLocation" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" placeholder="e.g. Downtown Core" />
          </div>
          <div class="space-y-2">
            <label class="text-[10px] font-black text-muted uppercase tracking-[0.2em]">Address Details</label>
            <input type="text" [(ngModel)]="createAddress" [disabled]="createLoading" class="w-full bg-slate-50 border-none rounded-2xl px-5 py-4 text-sm font-bold text-primary focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300" placeholder="e.g. 101 Innovation Ave" />
          </div>
        </div>
        
        <div class="mt-10 flex items-center justify-end gap-4">
          <button class="pos-btn pos-btn-primary px-12 py-4" [disabled]="createLoading || !canCreate()" (click)="createStore()">
            <span *ngIf="!createLoading">Deploy Store</span>
            <div *ngIf="createLoading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          </button>
        </div>

        <div *ngIf="createError" class="mt-6 p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-bold leading-relaxed">
          {{ createError }}
        </div>
      </div>

      <!-- Filters & Stats Bar -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-6 items-center">
        <div class="lg:col-span-2 relative group">
          <input type="text" [(ngModel)]="searchTerm" (keyup.enter)="applyFilters()" class="w-full bg-white border border-slate-100 rounded-[1.5rem] px-6 py-4 pl-14 text-sm font-bold text-primary focus:ring-4 focus:ring-accent/5 transition-all shadow-sm" placeholder="Scan network for store names or regions..." />
          <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 absolute left-6 top-1/2 -translate-y-1/2 text-muted group-focus-within:text-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        
        <select [(ngModel)]="status" (change)="applyFilters()" class="bg-white border border-slate-100 rounded-[1.5rem] px-6 py-4 text-sm font-bold text-primary focus:ring-4 focus:ring-accent/5 transition-all shadow-sm cursor-pointer appearance-none">
          <option value="all">Network: All Nodes</option>
          <option value="active">Operational Only</option>
          <option value="inactive">Currently Offline</option>
        </select>

        <div class="flex gap-2">
          <button class="flex-1 pos-btn pos-btn-primary py-4 text-xs tracking-widest uppercase" (click)="applyFilters()">Execute Search</button>
          <button class="w-14 h-14 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-muted rounded-2xl transition-colors" (click)="resetFilters()">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <div *ngIf="loading() && !stores().length" class="py-20 flex justify-center italic text-muted text-sm font-bold tracking-widest animate-pulse">
        Polling Network Status...
      </div>

      <div *ngIf="error()" class="bg-red-50 text-red-600 p-8 rounded-[2rem] border border-red-100 flex items-center gap-6">
        <div class="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-600">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 class="font-black text-red-900 leading-none">Access Violation</h4>
          <p class="text-xs font-bold mt-1 opacity-70">{{ error() }}</p>
        </div>
      </div>

      <!-- Data Table -->
      <div class="pos-card overflow-hidden border border-slate-50" *ngIf="!error()">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="border-b border-slate-50 bg-slate-50/50">
                <th class="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Node Identity</th>
                <th class="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Primary Location</th>
                <th class="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.2em]">Operational Status</th>
                <th class="px-8 py-6 text-[10px] font-black text-muted uppercase tracking-[0.2em] text-right">Master Control</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-50">
              <tr *ngFor="let store of stores()" class="hover:bg-slate-50/50 transition-colors group">
                <td class="px-8 py-6">
                  <span class="text-sm font-black text-primary leading-none group-hover:text-accent transition-colors">{{ store.name }}</span>
                </td>
                <td class="px-8 py-6">
                  <span class="text-xs font-bold text-secondary">{{ store.location }}</span>
                </td>
                <td class="px-8 py-6">
                  <span class="pos-badge" [class]="store.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'">
                    {{ store.isActive ? 'OPERATIONAL' : 'OFFLINE' }}
                  </span>
                </td>
                <td class="px-8 py-6 text-right">
                  <a [routerLink]="['/admin/stores', store.id]" class="pos-btn border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 text-xs font-black tracking-tight px-6 py-2.5 inline-flex items-center gap-2 transition-all active:scale-95">
                    Terminal Details
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </a>
                </td>
              </tr>
              <tr *ngIf="stores().length === 0 && !loading()">
                <td colspan="4" class="px-8 py-20 text-center italic text-muted text-sm font-bold tracking-widest opacity-40">Zero Node Records Found</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination Footer -->
        <div class="px-8 py-6 bg-slate-50/30 flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-slate-50">
          <div class="flex items-center gap-3">
             <span class="text-[10px] font-black text-muted uppercase tracking-widest">Page Cluster</span>
             <div class="px-3 py-1 bg-white border border-slate-100 rounded-lg text-xs font-black text-primary">{{ page() }} / {{ totalPages() }}</div>
             <span class="text-[10px] font-bold text-muted lowercase">({{ totalCount() }} total nodes)</span>
          </div>
          
          <div class="flex gap-3">
            <button class="pos-btn bg-white border border-slate-100 hover:bg-slate-50 text-xs font-black tracking-widest uppercase px-6 h-11 disabled:opacity-30 disabled:grayscale transition-all active:scale-95" [disabled]="page() <= 1" (click)="setPage(page() - 1)">Previous</button>
            <button class="pos-btn bg-white border border-slate-100 hover:bg-slate-50 text-xs font-black tracking-widest uppercase px-6 h-11 disabled:opacity-30 disabled:grayscale transition-all active:scale-95" [disabled]="page() >= totalPages()" (click)="setPage(page() + 1)">Next Cluster</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AdminStoresComponent implements OnInit {
  private readonly svc = inject(AdminStoresService);

  loading = this.svc.loading;
  error = this.svc.error;
  stores = this.svc.stores;
  page = this.svc.page;
  totalPages = this.svc.totalPages;
  totalCount = this.svc.totalCount;

  searchTerm = '';
  status: 'all' | 'active' | 'inactive' = 'all';

  creating = false;
  createLoading = false;
  createError: string | null = null;
  createName = '';
  createLocation = '';
  createAddress = '';

  ngOnInit(): void {
    this.searchTerm = this.svc.searchTerm();
    this.status = this.svc.status();
    this.svc.refresh();
  }

  canCreate(): boolean {
    return this.createName.trim().length > 0 && this.createLocation.trim().length > 0 && this.createAddress.trim().length > 0;
  }

  createStore(): void {
    this.createLoading = true;
    this.createError = null;

    this.svc.createStore(this.createName.trim(), this.createLocation.trim(), this.createAddress.trim())
      .pipe(finalize(() => (this.createLoading = false)))
      .subscribe({
        next: (success) => {
          if (success) {
            this.createName = '';
            this.createLocation = '';
            this.createAddress = '';
            this.creating = false;
          } else {
            this.createError = 'Failed to create a new store.';
          }
        },
        error: () => {
          this.createError = 'Failed to execute store creation request.';
        },
      });
  }

  applyFilters(): void {
    this.svc.searchTerm.set(this.searchTerm);
    this.svc.status.set(this.status);
    this.svc.applyFilters();
  }

  setPage(next: number): void {
    this.svc.setPage(next);
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.status = 'all';
    this.applyFilters();
  }
}
