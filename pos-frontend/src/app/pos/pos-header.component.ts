import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-pos-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="h-20 bg-white border-b border-slate-50 flex items-center px-8 lg:px-12 justify-between sticky top-0 z-[10] shadow-sm">
      <div class="flex items-center gap-10">
        <!-- Brand Logo -->
        <div class="flex items-center gap-3 cursor-pointer" routerLink="/pos">
          <div class="w-10 h-10 flex items-center justify-center">
            <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-full h-full object-contain" alt="Logo">
          </div>
          <div class="flex flex-col -gap-1">
            <span class="text-xl font-black text-primary tracking-tighter leading-none uppercase">Retail<span class="text-accent">POS</span></span>
            <span class="text-[9px] font-bold text-muted uppercase tracking-[0.2em] opacity-40">Cashier Terminal</span>
          </div>
        </div>

        <!-- Main Nav -->
        <nav class="flex items-center gap-1">
          <a routerLink="/pos" routerLinkActive="bg-slate-50 text-accent" [routerLinkActiveOptions]="{exact: true}" 
             class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-accent transition-all">
            Products
          </a>
          <a routerLink="/pos/bills" routerLinkActive="bg-slate-50 text-accent" 
             class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-accent transition-all">
            Bills
          </a>
          <a *ngIf="auth.identity?.role === 'Admin'" routerLink="/pos/refunds" routerLinkActive="bg-slate-50 text-accent" 
             class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-accent transition-all">
            Refunds
          </a>
          <a routerLink="/pos/profile" routerLinkActive="bg-slate-50 text-accent" 
             class="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] text-muted hover:text-accent transition-all">
            Profile
          </a>
        </nav>
      </div>

      <div class="flex items-center gap-8">
        <div class="text-right hidden sm:block">
          <p class="text-[9px] font-black text-muted/60 uppercase tracking-[0.3em] mb-1">Active Session</p>
          <p class="text-[11px] font-bold text-primary flex items-center justify-end gap-2 uppercase tracking-wide">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            {{ auth.identity?.email || 'Operator Console' }}
          </p>
        </div>
        <div class="h-8 w-px bg-slate-100"></div>
        <button routerLink="/pos/profile" class="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-blue-50 hover:text-blue-500 flex items-center justify-center text-secondary transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        </button>
        <button (click)="logout()" class="w-10 h-10 rounded-2xl bg-slate-50 hover:bg-red-50 hover:text-red-500 flex items-center justify-center text-secondary transition-all group">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5" class="group-hover:-translate-x-0.5 transition-transform"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
        </button>
      </div>
    </header>
  `,
  styles: [`
    :host { display: block; }
  `]
})
export class PosHeaderComponent {
  protected readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
