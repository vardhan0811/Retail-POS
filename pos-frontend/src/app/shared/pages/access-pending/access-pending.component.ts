import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/auth.service';

@Component({
  selector: 'app-access-pending',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-background flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <!-- Decor (Same as Login) -->
      <div class="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
      <div class="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -ml-64 -mb-64"></div>

      <div class="w-full max-w-[440px] relative z-10 fade-up">
        <!-- Brand Header (Same as Login) -->
        <div class="text-center mb-10">
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-slate-50 mb-6">
            <div class="w-8 h-8 flex items-center justify-center">
              <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-full h-full object-contain" alt="Logo">
            </div>
            <span class="text-xs font-black text-accent uppercase tracking-[0.2em]">Retail<span class="text-primary">POS</span></span>
          </div>
          <h1 class="text-4xl font-black text-primary tracking-tighter uppercase leading-none">
            Access<span class="text-accent">Pending</span>
          </h1>
          <p class="text-sm font-medium text-muted mt-2">Security Authorization Step 2</p>
        </div>

        <div class="pos-card p-10 bg-white shadow-2xl transition-shadow duration-300 hover:shadow-primary/5">
          <div class="text-center">
            <!-- Refined Icon Section -->
            <div class="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse-slow">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 class="text-2xl font-black text-primary tracking-tight mb-4">Identity Authenticated</h2>
            
            <p class="text-sm font-medium text-slate-500 mb-8 leading-relaxed">
              Your account has been authenticated successfully, but is not yet assigned to a store or role.
            </p>

            <!-- Status Pill (Matches styles.scss pos-badge-awaiting) -->
            <div class="pos-badge pos-badge-awaiting mb-8 inline-flex items-center gap-2 px-6 py-3 !text-xs !font-bold">
              <span class="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
              Awaiting Admin Assignment
            </div>

            <p class="text-[11px] font-bold text-muted/60 uppercase tracking-[0.15em] mb-10 block">
              Please contact your administrator if this takes longer than expected.
            </p>

            <button (click)="logout()" class="w-full bg-[#0B0F19] text-white py-5 rounded-full font-bold text-base flex items-center justify-center gap-3 shadow-xl hover:bg-slate-800 transition-all active:scale-[0.98] group">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
              </svg>
              <span>Back to Intro</span>
            </button>
          </div>
        </div>

        <div class="mt-8 text-center">
            <p class="text-[10px] font-bold text-muted/60 uppercase tracking-[0.2em] leading-relaxed">
              Secured Connection • v4.2.0-STABLE<br>
              Authorized Device Only
            </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .animate-pulse-slow {
      animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .8; transform: scale(1.05); }
    }
  `]
})
export class AccessPendingComponent {
  private readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
