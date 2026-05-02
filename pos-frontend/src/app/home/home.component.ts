import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';


import { HeroComponent } from './hero/hero.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroComponent],

  template: `
    <div class="min-h-screen bg-white text-primary">
      
      <!-- 🧭 Premium Centered Floating Navbar -->
      <div class="fixed top-8 left-0 right-0 z-[100] flex justify-center px-6 animate-in fade-in slide-in-from-top-4 duration-1000">
        <header class="bg-white/90 backdrop-blur-3xl border border-black/[0.03] rounded-full p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] flex items-center pointer-events-auto transition-all duration-500 hover:shadow-[0_30px_70px_rgba(0,0,0,0.15)] ring-1 ring-black/5">
          
          <!-- 🏷️ Logo Section -->
          <div class="flex items-center gap-3 pl-5 pr-8 border-r border-black/[0.05] group cursor-pointer transition-colors hover:text-accent">
            <div class="w-8 h-8 flex items-center justify-center transition-transform group-hover:scale-110">
               <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-full h-full object-contain" alt="Logo">
            </div>
            <span class="text-[11px] font-black text-primary uppercase tracking-[0.25em] hidden lg:block">Retail POS</span>
          </div>

          <!-- 🗺️ Navigation Links -->
          <nav class="hidden md:flex items-center px-6 gap-2">
            <a href="#services" class="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all uppercase tracking-[0.2em]">Services</a>
            <a href="#work" class="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all uppercase tracking-[0.2em]">Our Work</a>
            <a href="#achievements" class="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all uppercase tracking-[0.2em]">Achievements</a>
            <a href="#faqs" class="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all uppercase tracking-[0.2em]">FAQs</a>
            <a href="#contact" class="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-primary hover:bg-slate-50 rounded-full transition-all uppercase tracking-[0.2em]">Contact</a>
          </nav>

          <!-- ⚡ Action Section (Balanced) -->
          <div class="pl-2 pr-1">
            <button type="button" (click)="startSession()" class="bg-[#0B0F19] text-white pl-7 pr-1.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-5 hover:bg-accent transition-all shadow-xl shadow-black/5 group/pill-btn overflow-hidden relative">
              <span class="relative z-10">Sign In</span>
              <div class="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center group-hover/pill-btn:bg-white group-hover/pill-btn:text-[#0B0F19] transition-all relative z-10">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </div>
              <div class="absolute inset-0 bg-accent translate-y-full group-hover/pill-btn:translate-y-0 transition-transform duration-500"></div>
            </button>
          </div>
        </header>
      </div>

      <main class="pt-0">
        <!-- 🚀 Hero Section -->
        <app-hero></app-hero>

        <!-- 🧩 Core Values -->
        <section id="services" class="max-w-[1400px] mx-auto px-6 py-32 grid grid-cols-1 md:grid-cols-3 gap-10 fade-up">
           <div class="pos-card p-12 hover-lift group border-transparent hover:border-accent/10">
              <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 text-primary group-hover:bg-accent group-hover:text-white transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 class="text-2xl font-black text-primary tracking-tight mb-4">Real-Time Billing</h3>
              <p class="text-secondary font-medium leading-relaxed">Fast checkout with accurate calculations, tax handling, and instant cloud synchronization.</p>
           </div>
           
           <div class="pos-card p-12 hover-lift group border-transparent hover:border-accent/10">
              <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 text-primary group-hover:bg-accent group-hover:text-white transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <h3 class="text-2xl font-black text-primary tracking-tight mb-4">Inventory Intel</h3>
              <p class="text-secondary font-medium leading-relaxed">Automatic stock tracking that updates the moment a bill is finalized. Prevent mismatches live.</p>
           </div>
           
           <div class="pos-card p-12 hover-lift group border-transparent hover:border-accent/10">
              <div class="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mb-8 text-primary group-hover:bg-accent group-hover:text-white transition-all">
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <h3 class="text-2xl font-black text-primary tracking-tight mb-4">Refund Governance</h3>
              <p class="text-secondary font-medium leading-relaxed">Controlled refund system with granular approval workflows and administrative audit stamps.</p>
           </div>
        </section>

        <!-- ⚙️ System Features -->
        <section id="work" class="bg-slate-50/30 py-32 border-y border-slate-100/50">
           <div class="max-w-[1200px] mx-auto px-6 fade-up">
              <div class="text-center mb-20">
                 <h2 class="text-[10px] font-black uppercase tracking-[0.4em] text-accent mb-4">Core Architecture</h2>
                 <p class="text-3xl font-black text-primary tracking-tight">Engineered for Reliability</p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                 <div class="flex gap-6">
                    <div class="text-accent shrink-0 pt-1">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h4 class="font-black text-primary mb-2 text-base">Multi-user system</h4>
                       <p class="text-xs text-secondary font-medium leading-relaxed">Independent operator sessions with secure role-based access tokens.</p>
                    </div>
                 </div>
                 <div class="flex gap-6">
                    <div class="text-accent shrink-0 pt-1">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h4 class="font-black text-primary mb-2 text-base">Admin Workflows</h4>
                       <p class="text-xs text-secondary font-medium leading-relaxed">Sensitive operations like refunds require explicit administrative clearance.</p>
                    </div>
                 </div>
                 <div class="flex gap-6">
                    <div class="text-accent shrink-0 pt-1">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h4 class="font-black text-primary mb-2 text-base">Secure Transactions</h4>
                       <p class="text-xs text-secondary font-medium leading-relaxed">Finalized bills are cryptographically immutable and stored in redundant clusters.</p>
                    </div>
                 </div>
                 <div class="flex gap-6">
                    <div class="text-accent shrink-0 pt-1">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h4 class="font-black text-primary mb-2 text-base">Audit Tracking</h4>
                       <p class="text-xs text-secondary font-medium leading-relaxed">Full trail of every stock movement, refund request, and price change.</p>
                    </div>
                 </div>
                 <div class="flex gap-6">
                    <div class="text-accent shrink-0 pt-1">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h4 class="font-black text-primary mb-2 text-base">Cloud Sync</h4>
                       <p class="text-xs text-secondary font-medium leading-relaxed">Real-time availability updates across global storefronts and admin panels.</p>
                    </div>
                 </div>
                 <div class="flex gap-6">
                    <div class="text-accent shrink-0 pt-1">
                       <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                       <h4 class="font-black text-primary mb-2 text-base">Role Governance</h4>
                       <p class="text-xs text-secondary font-medium leading-relaxed">Restrict access to reports and settings based on user authorization levels.</p>
                    </div>
                 </div>
              </div>
           </div>
        </section>

        <!-- 🛤️ How it works -->
        <section class="py-32 max-w-[1200px] mx-auto px-6 fade-up">
           <div class="text-center mb-24">
              <h2 class="text-4xl font-black text-primary tracking-tight">The Operational Lifecycle</h2>
           </div>
           
           <div class="relative grid grid-cols-1 md:grid-cols-4 gap-12 text-center overflow-hidden lg:overflow-visible">
              <div class="absolute top-1/4 left-0 right-0 h-0.5 bg-slate-100 hidden md:block -z-10 mx-24"></div>
              
              <div class="flex flex-col items-center group">
                 <div class="w-16 h-16 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-xl text-primary mb-6 transition-transform group-hover:scale-110 group-hover:bg-accent group-hover:text-white group-hover:border-accent duration-500">1</div>
                 <h4 class="font-black text-primary mb-2">Create Order</h4>
                 <p class="text-[10px] uppercase font-bold text-muted tracking-widest opacity-60">Cashier Selection</p>
              </div>

              <div class="flex flex-col items-center group">
                 <div class="w-16 h-16 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-xl text-primary mb-6 transition-transform group-hover:scale-110 group-hover:bg-accent group-hover:text-white group-hover:border-accent duration-500">2</div>
                 <h4 class="font-black text-primary mb-2">Process Payment</h4>
                 <p class="text-[10px] uppercase font-bold text-muted tracking-widest opacity-60">Fiscal Finalization</p>
              </div>

              <div class="flex flex-col items-center group">
                 <div class="w-16 h-16 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-xl text-primary mb-6 transition-transform group-hover:scale-110 group-hover:bg-accent group-hover:text-white group-hover:border-accent duration-500">3</div>
                 <h4 class="font-black text-primary mb-2">Sync Inventory</h4>
                 <p class="text-[10px] uppercase font-bold text-muted tracking-widest opacity-60">Auto Stock Impact</p>
              </div>

              <div class="flex flex-col items-center group">
                 <div class="w-16 h-16 rounded-[2rem] bg-white border border-slate-200 shadow-sm flex items-center justify-center font-black text-xl text-primary mb-6 transition-transform group-hover:scale-110 group-hover:bg-accent group-hover:text-white group-hover:border-accent duration-500">4</div>
                 <h4 class="font-black text-primary mb-2">Admin Approval</h4>
                 <p class="text-[10px] uppercase font-bold text-muted tracking-widest opacity-60">Controlled Exceptions</p>
              </div>
           </div>
        </section>

        <!-- 🛡️ Trust & Stats -->
        <section id="achievements" class="max-w-[1200px] mx-auto px-6 py-32 border-t border-slate-100">
           <div class="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
              <div>
                 <h2 class="text-4xl font-black text-primary tracking-tighter mb-8 max-w-md leading-tight">Built for Production Grade Performance.</h2>
                 <ul class="space-y-6">
                    <li class="flex items-center gap-4">
                       <div class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <span class="text-sm font-bold text-secondary">Secure session-based operations</span>
                    </li>
                    <li class="flex items-center gap-4">
                       <div class="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                       </div>
                       <span class="text-sm font-bold text-secondary">Accurate transaction tracking</span>
                    </li>
                 </ul>
              </div>
              
              <div class="grid grid-cols-2 gap-6">
                 <div class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 text-center">
                    <p class="text-3xl font-black text-primary mb-1 tracking-tighter">99.9%</p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-muted opacity-50">Uptime</p>
                 </div>
                 <div class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 text-center">
                    <p class="text-3xl font-black text-primary mb-1 tracking-tighter">0.02s</p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-muted opacity-50">Latency</p>
                 </div>
                 <div class="p-8 bg-slate-50/50 rounded-3xl border border-slate-100 text-center col-span-2">
                    <p class="text-3xl font-black text-primary mb-1 tracking-tighter">Enterprise</p>
                    <p class="text-[10px] font-black uppercase tracking-widest text-muted opacity-50">Operational Grade</p>
                 </div>
              </div>
           </div>
        </section>

         <!-- 🏁 Final conversion moment (Premium Dark) -->
         <section class="max-w-[1200px] mx-auto px-6 py-40 text-center fade-up">
            <div class="cta-dark-box rounded-[2rem] p-12 lg:p-24 relative overflow-hidden group">
               <!-- Subtle Background Layers -->
               <div class="absolute inset-0 bg-gradient-to-b from-[#0B0F1A] to-[#111827]"></div>
               <div class="absolute inset-0 opacity-10 pointer-events-none noise-bg"></div>
               <div class="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-[100px] -mr-48 -mt-48 transition-transform group-hover:scale-125 duration-1000"></div>
               
               <div class="relative z-10 flex flex-col items-center">
                  <h2 class="text-3xl lg:text-5xl font-extrabold text-white tracking-tighter mb-6 leading-tight max-w-2xl mx-auto">
                    You’ve reached the end — now let’s start something real.
                  </h2>
                  <p class="text-slate-400 text-lg lg:text-xl font-medium mb-12 max-w-xl">
                    Launch your retail system with speed, clarity, and full control.
                  </p>
                  
                  <div class="flex flex-col items-center gap-8">
                    <button type="button" (click)="startSession()" class="pos-btn-cta-dark group/btn">
                      Get Started Now
                      <span class="ml-2 group-hover/btn:translate-x-1 transition-transform">→</span>
                    </button>
                    
                    <span class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500/80">
                      Trusted by modern retail operators
                    </span>
                  </div>

                  <!-- 🧩 Scrolling Tag Row -->
                  <div class="mt-20 w-fit relative overflow-hidden">
                    <div class="flex gap-4 animate-scroll whitespace-nowrap px-4">
                      <!-- Duplicated for seamless loop -->
                      <span class="dark-tag">Billing Automation</span>
                      <span class="dark-tag">Inventory Tracking</span>
                      <span class="dark-tag">Refund Management</span>
                      <span class="dark-tag">Real-time Analytics</span>
                      <span class="dark-tag">Multi-store Control</span>
                      <span class="dark-tag">Audit Logs</span>
                      <span class="dark-tag">Cloud Sync</span>
                      <span class="dark-tag">Secure POS</span>
                      <!-- Loop back -->
                      <span class="dark-tag">Billing Automation</span>
                      <span class="dark-tag">Inventory Tracking</span>
                      <span class="dark-tag">Refund Management</span>
                      <span class="dark-tag">Real-time Analytics</span>
                    </div>
                  </div>
               </div>
            </div>
         </section>
      </main>

      <footer class="max-w-[1200px] mx-auto px-6 py-20 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-10">
        <div class="flex items-center gap-2 grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all cursor-crosshair">
          <span class="text-sm font-black tracking-tighter text-primary uppercase">Retail POS <span class="text-accent underline decoration-2 underline-offset-4 decoration-accent/20">Enterprise</span></span>
        </div>
        
        <div class="flex items-center gap-10">
           <span class="text-[10px] font-black uppercase tracking-widest text-muted">v2.4.1</span>
           <span class="text-[10px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
              <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> System Operational
           </span>
        </div>
      </footer>

    </div>
  `,
  styles: [`
    :host { display: block; }
    html { scroll-behavior: smooth; }

    .cta-dark-box {
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05), 0 40px 100px rgba(0,0,0,0.5);
    }

    .pos-btn-cta-dark {
      @apply bg-[#0F172A] text-white px-10 py-5 rounded-full font-bold text-lg flex items-center shadow-2xl transition-all duration-300;
      box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    }
    
    .pos-btn-cta-dark:hover {
      @apply -translate-y-[3px] bg-slate-900;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
    }

    .dark-tag {
      @apply px-4 py-2 bg-white/5 border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-500 cursor-default;
    }

    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    .animate-scroll {
      animation: scroll 30s linear infinite;
    }
  `]
})
export class HomeComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  startSession(): void {
    if (this.auth.isAuthenticated) {
      this.auth.redirectAfterLogin(this.auth.identity);
    } else {
      void this.router.navigate(['/login']);
    }
  }
}
