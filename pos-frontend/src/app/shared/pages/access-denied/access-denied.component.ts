import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';

import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div class="pos-card max-w-md w-full p-12 bg-white border border-slate-100 shadow-2xl shadow-slate-200/50 text-center animate-in zoom-in-95 duration-500">
        <div class="w-20 h-20 bg-red-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
             <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
           </svg>
        </div>
        
        <h1 class="text-4xl font-black text-primary tracking-tighter mb-4">Access Restricted</h1>
        <p class="text-sm font-medium text-secondary mb-10 leading-relaxed">
          The operation node you're trying to reach requires higher authorization levels than currently assigned to your profile.
        </p>

        <div class="flex flex-col gap-3">
          <button (click)="goHome()" class="pos-btn pos-btn-primary py-4 text-xs tracking-widest uppercase font-black">
            Return to Dashboard
          </button>
          <button (click)="switchAccount()" class="text-[10px] font-black text-muted uppercase tracking-[0.2em] hover:text-primary transition-colors py-4">
            Switch Account Identity
          </button>
        </div>
      </div>
    </div>
  `
})
export class AccessDeniedComponent {
  private readonly router = inject(Router);

  goHome(): void {
    // Navigate home based on default role logic or just dashboard
    this.router.navigate(['/']);
  }

  switchAccount(): void {
    this.router.navigate(['/login'], {
      state: { allowLoginAccess: true }
    });
  }
}
