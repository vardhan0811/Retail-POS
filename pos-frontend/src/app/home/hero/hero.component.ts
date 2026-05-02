import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';



@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],

  template: `
    <section class="hero-minimal bg-dot-grid relative overflow-hidden">
      <!-- 🌐 Background Decorative Elements -->
      <div class="hero-glow"></div>
      
      <!-- 💬 Floating Testimonial Cards -->
      <div class="absolute top-[30%] left-[8%] z-20 animate-float opacity-90 hidden xl:block -rotate-[3deg]">
        <div class="p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xs">
          <p class="text-[13px] text-slate-500 font-medium leading-relaxed italic mb-4">
            "We were close to giving up. Retail POS rebuilt our confidence and delivered a fintech mobile app end-to-end."
          </p>
          <div class="flex items-center gap-3">
             <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=100&auto=format&fit=crop" class="w-8 h-8 rounded-full object-cover bg-slate-200" alt="Alex Rivera" />
             <div class="flex flex-col">
               <span class="text-[11px] font-black text-[#0B0F19]">Alex Rivera</span>
               <span class="text-[10px] text-slate-400">CEO, Swift Retail</span>
             </div>
          </div>
        </div>
      </div>

      <div class="absolute top-[35%] right-[8%] z-20 animate-float opacity-90 hidden xl:block rotate-[3deg]" style="animation-delay: 2s">
        <div class="p-6 bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-xs">
          <p class="text-[13px] text-slate-500 font-medium leading-relaxed italic mb-4">
            "Cloud sync and real-time billing have transformed our store operations. It's truly enterprise-grade."
          </p>
          <div class="flex items-center gap-3">
             <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100&auto=format&fit=crop" class="w-8 h-8 rounded-full object-cover bg-slate-200" alt="Sarah Chen" />
             <div class="flex flex-col">
               <span class="text-[11px] font-black text-[#0B0F19]">Sarah Chen</span>
               <span class="text-[10px] text-slate-400">Owner, Zenith Store</span>
             </div>
          </div>
        </div>
      </div>

      <!-- 🚀 Main Hero Content -->
      <div class="max-w-[1200px] mx-auto px-6 text-center relative z-10 pt-32 pb-10">
         <div class="inline-flex items-center gap-2 px-3 py-1 bg-[#EEF2FF] rounded-full mb-8 border border-blue-100/50">
            <span class="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></span>
            <span class="text-[11px] font-bold text-blue-600/80 uppercase tracking-widest">Only 2 open slots available! →</span>
         </div>
         
         <h1 class="text-5xl lg:text-7xl font-extrabold text-[#0B0F19] tracking-tighter mb-8 leading-[1.05] max-w-3xl mx-auto hero-fade">
           Modern Retail POS Platform<br/>Powering Your <span class="text-blue-600 italic">Business Growth</span>
         </h1>
         
         <p class="text-lg text-slate-500 max-w-[550px] mx-auto leading-relaxed mb-12 font-medium hero-fade-delay">
           Manage billing, inventory, and refunds with surgical precision. Designed for high-performance retail environments.
         </p>
         
         <div class="flex flex-col items-center justify-center gap-6 hero-fade-delay-more">
            <div class="flex flex-col items-center gap-4">
               <div class="flex -space-x-3">
                 <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=100&auto=format&fit=crop" class="w-10 h-10 rounded-full border-2 border-white object-cover bg-slate-200 shadow-xl" />
                 <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=100&auto=format&fit=crop" class="w-10 h-10 rounded-full border-2 border-white object-cover bg-slate-200 shadow-xl" />
                 <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?q=80&w=100&auto=format&fit=crop" class="w-10 h-10 rounded-full border-2 border-white object-cover bg-slate-200 shadow-xl" />
               </div>
               <div class="flex flex-col items-center">
                  <div class="flex text-amber-400 gap-1 text-sm mb-1">
                    ★ ★ ★ ★ ★
                  </div>
                  <span class="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">From 30+ enterprise reviews</span>
               </div>
            </div>
         </div>
      </div>

      <!-- 🧩 Seamless Infinite Scroll Cards Section -->
      <div class="scroll-wrapper mt-10 mb-20">
        <div class="scroll-track">
          <!-- First Set of Cards -->
          <div class="scroll-content">
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Smart Inventory</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=800&auto=format&fit=crop" alt="Inventory" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Real-time Analytics</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop" alt="Analytics" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Security Gateway</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop" alt="Security" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Cloud Performance</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=800&auto=format&fit=crop" alt="Cloud" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Customer Insights</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=800&auto=format&fit=crop" alt="Customers" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Global Scalability</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop" alt="Scaling" />
                 </div>
               </div>
             </div>
          </div>
          
          <!-- Exact Duplicate for Seamless Loop -->
          <div class="scroll-content">
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Smart Inventory</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1556742044-3c52d6e88c62?q=80&w=800&auto=format&fit=crop" alt="Inventory" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Real-time Analytics</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=800&auto=format&fit=crop" alt="Analytics" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Security Gateway</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop" alt="Security" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Cloud Performance</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1544197150-b99a580bb7a8?q=80&w=800&auto=format&fit=crop" alt="Cloud" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Customer Insights</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?q=80&w=800&auto=format&fit=crop" alt="Customers" />
                 </div>
               </div>
             </div>
             <div class="scroll-card">
               <div class="inner-card group">
                 <h4>Global Scalability</h4>
                 <div class="img-container">
                    <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=800&auto=format&fit=crop" alt="Scaling" />
                 </div>
               </div>
             </div>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host { display: block; }

    .hero-minimal {
      position: relative;
      width: 100%;
      min-height: 100vh;
      background: #F8FAFC;
      padding-top: 100px;
    }

    .hero-glow {
      position: absolute;
      top: 20%;
      left: 50%;
      transform: translateX(-50%);
      width: 60%;
      height: 40%;
      background: radial-gradient(circle at center, rgba(37,99,235,0.03), transparent 70%);
      pointer-events: none;
      z-index: 1;
    }

    /* 🎞️ Infinite Scroll Logic */
    .scroll-wrapper {
      position: relative;
      width: 100%;
      overflow: hidden;
      mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
      -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
    }

    /* Edge Fades using pseudo-elements */
    .scroll-wrapper::before,
    .scroll-wrapper::after {
      content: "";
      position: absolute;
      top: 0;
      width: 120px;
      height: 100%;
      z-index: 10;
      pointer-events: none;
    }

    .scroll-wrapper::before {
      left: 0;
      background: linear-gradient(to right, #F8FAFC, transparent);
    }

    .scroll-wrapper::after {
      right: 0;
      background: linear-gradient(to left, #F8FAFC, transparent);
    }

    .scroll-track {
      display: flex;
      width: max-content;
      animation: scrollLoop 25s linear infinite;
      will-change: transform;
    }

    .scroll-content {
      display: flex;
      gap: 32px;
      padding-right: 32px; /* Ensure gap between loops matches internal gap */
    }

    .scroll-card {
      min-width: 420px;
      user-select: none;
    }

    .inner-card {
      @apply p-8 bg-white border border-slate-100 rounded-[2rem] shadow-2xl transition-all duration-300;
    }

    .inner-card h4 {
      @apply text-xl font-black text-[#0B0F19] mb-4;
    }

    .img-container {
      @apply h-48 bg-slate-50 rounded-2xl overflow-hidden relative;
    }

    .img-container img {
      @apply w-full h-full object-cover transition-transform duration-700;
    }

    .inner-card:hover {
      @apply border-[#0B0F19]/10 -translate-y-1;
    }

    .inner-card:hover img {
      @apply scale-105;
    }

    @keyframes scrollLoop {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }

    /* 💬 Interactions */
    .animate-float {
      animation: float 6s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-15px); }
    }

    .hero-fade {
      animation: fadeUp 1s ease-out forwards;
    }
    .hero-fade-delay {
      opacity: 0;
      animation: fadeUp 1s ease-out 0.2s forwards;
    }
    .hero-fade-delay-more {
      opacity: 0;
      animation: fadeUp 1s ease-out 0.4s forwards;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class HeroComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  constructor() { }
  ngOnInit() { }

  startSession(): void {}
}
