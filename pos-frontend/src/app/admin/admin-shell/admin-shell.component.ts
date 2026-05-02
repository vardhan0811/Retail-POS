import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { StoreContextService } from '../../core/store-context.service';
import { APP_CONFIG } from '../../core/app-config';

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans">
      <!-- Premium Top Navigation (POS Style) -->
      <header class="no-print h-20 bg-white border-b border-slate-200 sticky top-0 z-50 px-8 flex items-center justify-between shadow-sm">
        <div class="flex items-center gap-10">
          <!-- Logo & Brand -->
          <div class="flex items-center gap-3 cursor-pointer" routerLink="/admin">
            <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-10 h-10 object-contain" alt="Logo">
            <div class="flex flex-col -gap-1">
              <span class="text-xl font-black text-primary tracking-tighter leading-none uppercase">Retail<span class="text-accent">POS</span></span>
              <span class="text-[9px] font-bold text-muted uppercase tracking-[0.2em] opacity-40">Admin Terminal</span>
            </div>
          </div>

          <!-- Main Navigation (Horizontal) -->
          <nav class="hidden xl:flex items-center gap-1 ml-4">
            <a routerLink="/admin" routerLinkActive="bg-primary/5 text-primary" [routerLinkActiveOptions]="{ exact: true }"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Dashboard</a>
            <a routerLink="/admin/catalog" routerLinkActive="bg-primary/5 text-primary"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Catalog</a>
            <a routerLink="/admin/inventory" routerLinkActive="bg-primary/5 text-primary"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Inventory</a>
            <a routerLink="/admin/stores" routerLinkActive="bg-primary/5 text-primary"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Stores</a>
            <a routerLink="/admin/users" routerLinkActive="bg-primary/5 text-primary"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Users</a>
            <a routerLink="/admin/reports" routerLinkActive="bg-primary/5 text-primary"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Reports</a>
            <a routerLink="/admin/refund-requests" routerLinkActive="bg-primary/5 text-primary"
               class="px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:bg-slate-50">Refunds</a>
          </nav>
        </div>

        <!-- Right Section (Controls & Profile) -->
        <div class="flex items-center gap-6">
          <!-- Store Selector -->
          <div *ngIf="auth.role === 'Admin'" class="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-1.5 border border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-primary opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            <select
              [value]="ctx.selectedStoreId() ?? ''"
              (change)="onStoreSelect($event)"
              class="bg-transparent border-none outline-none text-xs font-bold text-secondary focus:ring-0 cursor-pointer min-w-[150px]">
              <option value="">All Stores (Aggregated)</option>
              <option *ngFor="let s of ctx.stores()" [value]="s.id">{{ s.name }}</option>
            </select>
          </div>

          <div class="flex items-center gap-4 pl-6 border-l border-slate-100">
            <div class="flex flex-col items-end">
              <span class="text-xs font-black text-primary uppercase tracking-tight">{{ auth.identity?.name || 'Administrator' }}</span>
              <span class="text-[10px] font-bold text-accent uppercase tracking-widest">Active Session</span>
            </div>
            <button (click)="logout()" class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            </button>
          </div>
        </div>
      </header>

      <!-- Main Content Area -->
      <main class="flex-1 overflow-y-auto bg-slate-50/50">
        <div class="p-8">
          <router-outlet />
        </div>
      </main>
    </div>
  `
})
export class AdminShellComponent {
  protected readonly APP_CONFIG = APP_CONFIG;
  protected readonly auth = inject(AuthService);
  protected readonly ctx = inject(StoreContextService);
  protected readonly router = inject(Router);

  onStoreSelect(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const storeId = value || null;
    
    this.ctx.selectStore(storeId);

    // If the user was in POS mode (unlikely in Admin Shell, but good for safety),
    // or if we want to ensure any cached session state is cleared when switching stores:
    if (this.auth.identity?.mode === 'POS') {
      const identity = { ...this.auth.identity, mode: 'ADMIN' as const };
      this.auth.persistIdentity(identity);
    }
    
    // Refresh the current view to reflect new store data
    void this.router.navigate(['/admin'], { queryParams: { storeId: storeId }, queryParamsHandling: 'merge' });
  }

  logout(): void {
    this.auth.logout();
  }
}
