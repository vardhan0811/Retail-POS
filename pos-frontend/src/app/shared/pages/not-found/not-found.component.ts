import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans antialiased relative overflow-hidden">
      <!-- Background Texture -->
      <div class="absolute inset-0 bg-dot-grid opacity-[0.4] pointer-events-none"></div>
      
      <div class="max-w-md w-full bg-white rounded-[2.5rem] p-12 shadow-[0_20px_50px_rgba(0,0,0,0.04)] border border-slate-100 relative z-10 text-center fade-up">
        
        <!-- Icon -->
        <div class="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-slate-300 border border-slate-100">
           <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
             <path stroke-linecap="round" stroke-linejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
           </svg>
        </div>

        <h1 class="text-6xl font-black text-primary tracking-tighter mb-2">404</h1>
        <h2 class="text-xl font-black text-primary tracking-tight mb-4 uppercase">Target Not Located</h2>
        <p class="text-secondary font-medium text-sm leading-relaxed mb-10 opacity-70">
          The requested operational endpoint does not exist or has been relocated. Please re-synchronize your session.
        </p>

        <div class="flex flex-col items-center gap-4">
          <button (click)="refresh()" class="pos-btn-modern-black w-full group/btn">
             <span>REFRESH</span>
             <div class="btn-icon-circle">
               <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-[#0B0F19]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4.5"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
             </div>
          </button>
          
          <button (click)="goBack()" class="text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest flex items-center gap-2 py-2">
             <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
             GO BACK
          </button>
        </div>

      </div>

      <!-- Footer Branding -->
      <div class="absolute bottom-10 left-0 right-0 text-center">
         <p class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">OPERATOR CONSOLE v2.4.1</p>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }

    .pos-btn-modern-black {
      @apply bg-[#0B0F19] text-white px-8 py-4 rounded-full font-black text-sm flex items-center justify-center gap-3 shadow-xl transition-all duration-300 active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 20px 40px rgba(0,0,0,0.15);
    }

    .pos-btn-modern-black:hover {
      @apply -translate-y-1 bg-slate-900;
      box-shadow: 0 30px 60px rgba(0,0,0,0.25);
    }

    .pos-btn-modern-black .btn-icon-circle {
      @apply w-7 h-7 bg-white rounded-full flex items-center justify-center transition-transform duration-500 shadow-sm text-[#0B0F19];
    }

    .pos-btn-modern-black:hover .btn-icon-circle {
      @apply scale-110 rotate-[10deg];
    }
  `]
})
export class NotFoundComponent {
  private router = inject(Router);

  refresh() {
    window.location.reload();
  }

  goBack() {
    window.history.back();
  }
}
