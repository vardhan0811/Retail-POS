import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { NgIf, NgFor, DecimalPipe, DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminApi, DashboardStats } from '../../core/admin.api';
import { StoreContextService } from '../../core/store-context.service';
import { UserApi, UserDto } from '../../core/user.api';
import { AuthApi } from '../../core/auth.api';
import { AuthService } from '../../core/auth.service';
import { AuthIdentity, UserStatus } from '../../core/auth.models';
import { finalize } from 'rxjs';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [NgIf, NgFor, DecimalPipe, DatePipe, CommonModule, FormsModule],
  template: `
    <div class="max-w-[1700px] mx-auto p-12 lg:p-16 space-y-12">
      <!-- Header -->
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-10">
        <div>
          <h2 class="text-5xl font-black text-primary tracking-tight">Active Control</h2>
          <p class="text-sm font-bold text-muted uppercase tracking-[0.3em] mt-3 opacity-50">Enterprise Management Console</p>
        </div>
        <div class="flex items-center gap-6">
           <!-- View Mode Indicator -->
           <div class="flex items-center gap-3 px-6 py-4 bg-slate-50/50 rounded-2xl border border-slate-100">
              <span class="text-[10px] font-black uppercase tracking-[0.3em] text-muted opacity-40">Filter Context:</span>
              <span class="text-xs font-black text-primary uppercase tracking-widest">{{ ctx.selectedStoreId() ? 'Store Direct' : 'Global Aggregate' }}</span>
           </div>

          <button (click)="refresh()" [disabled]="loading()" class="pos-btn border border-slate-200 bg-white hover:bg-slate-50 px-8 py-4 flex items-center gap-3 group disabled:opacity-50">
             <span class="text-xs font-black uppercase tracking-widest text-primary opacity-60">{{ loading() ? 'Syncing...' : 'Sync Records' }}</span>
             <svg xmlns="http://www.w3.org/2000/svg" [class.animate-spin]="loading()" class="w-4 h-4 text-primary group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>
          <button (click)="openSessionModal()" class="pos-btn pos-btn-primary px-10 py-4 shadow-2xl shadow-primary/20">Start POS Session</button>
        </div>
      </div>
      
      <!-- Loading & Error -->
      <div *ngIf="loading()" class="py-40 flex flex-col items-center justify-center text-muted gap-8">
        <div class="relative">
          <div class="w-20 h-20 border-2 border-slate-100 border-t-primary rounded-full animate-spin"></div>
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="w-10 h-10 bg-primary/5 rounded-full animate-pulse"></div>
          </div>
        </div>
        <span class="text-xs font-black uppercase tracking-[0.4em] opacity-30 animate-pulse">Establishing Secure Uplink</span>
      </div>
      
      <div *ngIf="error()" class="bg-red-50 text-red-600 p-8 rounded-3xl border border-red-100 flex items-center gap-6 shadow-sm">
        <div class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <div>
          <h4 class="font-black text-sm uppercase tracking-wide">Interface Error</h4>
          <p class="text-sm font-bold opacity-80 mt-1">{{ error() }}</p>
        </div>
      </div>

      <div *ngIf="stats() as data" class="space-y-12">
        <!-- Top Row Metrics -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <!-- Total Gross Enhancement -->
          <div class="pos-card p-12 border border-slate-100 bg-white relative overflow-hidden group shadow-2xl shadow-slate-100/50">
            <div class="absolute -right-10 -top-10 w-48 h-48 bg-primary/5 rounded-full blur-[80px] group-hover:bg-primary/10 transition-colors duration-700"></div>
            <div class="relative z-10 flex flex-col h-full">
              <div class="flex items-center justify-between mb-8">
                 <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50">Revenue Summary</h3>
                 <span class="px-3 py-1.5 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-wider rounded-lg flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    {{ data.billingSummary.revenueChangePercentage }}%
                 </span>
              </div>
              <div class="text-6xl font-black text-primary tracking-tighter mb-4 leading-none">₹{{ data.billingSummary.todayRevenue | number:'1.2-2' }}</div>
              <p class="text-xs font-bold text-muted opacity-60 mb-8 uppercase tracking-widest">Today's Net Total</p>
              
              <div class="mt-auto grid grid-cols-2 gap-6 pt-8 border-t border-slate-50">
                 <div>
                    <span class="text-sm font-black text-primary block leading-none">{{ data.billingSummary.todayTransactions }}</span>
                    <span class="text-[9px] font-black text-muted uppercase tracking-wider opacity-40">Orders</span>
                 </div>
                 <div>
                    <span class="text-sm font-black text-primary block leading-none">₹{{ data.billingSummary.todayAvgBillValue | number:'1.0-0' }}</span>
                    <span class="text-[9px] font-black text-muted uppercase tracking-wider opacity-40">Avg Bill</span>
                 </div>
                 <div class="mt-2">
                    <span class="text-sm font-black text-red-500 block leading-none">₹{{ data.billingSummary.todayRefundAmount | number:'1.0-0' }}</span>
                    <span class="text-[9px] font-black text-muted uppercase tracking-wider opacity-40">Refunds</span>
                 </div>
                 <div class="mt-2">
                    <span class="text-sm font-black text-amber-600 block leading-none">{{ data.billingSummary.todayCancelledOrders }}</span>
                    <span class="text-[9px] font-black text-muted uppercase tracking-wider opacity-40">Cancelled</span>
                 </div>
              </div>
            </div>
          </div>

          <!-- Requires Attention (Alerts) -->
          <div class="pos-card p-12 border border-slate-100 bg-white shadow-sm overflow-hidden relative">
             <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50 mb-10">Requires Attention</h3>
             <div class="space-y-6">
                <div (click)="navigateToRefunds()" class="flex items-center justify-between group cursor-pointer p-4 hover:bg-slate-50 rounded-2xl transition-colors duration-300">
                   <div class="flex items-center gap-5">
                      <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3m9 14V5a2 2 0 00-2-2H6a2 2 0 00-2 2v16l4-2 4 2 4-2 4 2z" /></svg>
                      </div>
                      <span class="text-sm font-black text-primary uppercase tracking-tight">Pending Refunds</span>
                   </div>
                   <span class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-primary">{{ data.alerts.pendingRefunds }}</span>
                </div>
                <div (click)="navigateToInventory()" class="flex items-center justify-between group cursor-pointer p-4 hover:bg-slate-50 rounded-2xl transition-colors duration-300">
                   <div class="flex items-center gap-5">
                      <div class="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                      <span class="text-sm font-black text-primary uppercase tracking-tight">Low Stock Alert</span>
                   </div>
                   <span class="w-8 h-8 bg-red-100 text-red-600 rounded-lg flex items-center justify-center text-xs font-black">{{ data.alerts.lowStockItems }}</span>
                </div>
                <div (click)="navigateToInventory()" class="flex items-center justify-between group cursor-pointer p-4 hover:bg-slate-50 rounded-2xl transition-colors duration-300 opacity-50">
                   <div class="flex items-center gap-5">
                      <div class="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span class="text-sm font-black text-primary uppercase tracking-tight">Missing Syncs</span>
                   </div>
                   <span class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-xs font-black text-primary">0</span>
                </div>
             </div>
          </div>

          <!-- Sales Trend Chart -->
          <div class="pos-card p-12 border border-slate-100 bg-white shadow-sm flex flex-col h-full relative group">
             <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50 mb-10">Sales Trend (7D)</h3>
             <div class="flex-grow flex items-end justify-between gap-3 h-32 px-2">
                <div *ngFor="let day of data.billingSummary.salesTrend; let i = index" class="relative group/bar flex-grow flex flex-col items-center justify-end">
                   <div class="w-full bg-slate-50 group-hover/bar:bg-primary/5 rounded-t-lg transition-all duration-500" [style.height.%]="(day.revenue / getTrendMax(data.billingSummary.salesTrend)) * 100">
                      <div class="absolute -top-10 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-50">₹{{ day.revenue | number:'1.0-0' }}</div>
                   </div>
                   <div class="text-[8px] font-black text-muted uppercase tracking-tighter mt-4 opacity-40">{{ day.date | date:'EEE' }}</div>
                </div>
             </div>
          </div>
        </div>

        <!-- Dynamic Middle Row -->
        <div class="grid grid-cols-1 xl:grid-cols-3 gap-10">
           <!-- Staff Card -->
          <div class="pos-card p-12 border border-slate-100 bg-white relative group min-h-[400px]">
              <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50 mb-10">Active Staff</h3>
              <div class="text-6xl font-black text-primary tracking-tighter mb-10 leading-none">{{ data.billingSummary.activeStaffCount }}</div>
              <p class="text-[10px] font-black text-muted uppercase tracking-widest leading-relaxed opacity-50 mb-10">Current Operational Strength</p>
              
              <div class="space-y-4">
                 <div class="flex items-center gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100/30">
                    <div class="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-200"></div>
                    <span class="text-xs font-bold text-primary opacity-80 uppercase tracking-wide">Registry Updated {{ today | date:'shortTime' }}</span>
                 </div>
              </div>
           </div>

           <!-- Recent Activity Real Events -->
           <div class="pos-card p-12 border border-slate-100 bg-white shadow-sm xl:col-span-2 overflow-hidden flex flex-col">
              <div class="flex items-center justify-between mb-10">
                <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50">Operational Activity</h3>
                <span class="text-[9px] font-black text-primary bg-primary/5 px-3 py-1 rounded-lg uppercase tracking-widest border border-primary/10">Live Stream</span>
              </div>
              
              <div class="space-y-4 overflow-y-auto max-h-[300px] pr-4 custom-scrollbar">
                <div *ngFor="let act of data.recentActivity" class="flex items-start gap-6 p-5 hover:bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all duration-300 group">
                   <div [ngClass]="{
                     'bg-blue-50 text-blue-500': act.type === 'Sale',
                     'bg-amber-50 text-amber-500': act.type === 'Refund',
                     'bg-slate-50 text-slate-500': act.type !== 'Sale' && act.type !== 'Refund'
                   }" class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-95 transition-transform duration-500">
                     <svg *ngIf="act.type === 'Sale'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                     <svg *ngIf="act.type === 'Refund'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M16 15v-1a4 4 0 00-4-4H8m0 0l3 3m-3-3l3-3" /></svg>
                     <svg *ngIf="act.type !== 'Sale' && act.type !== 'Refund'" xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                   </div>
                   <div class="flex-grow pt-1">
                      <div class="flex items-center justify-between mb-1">
                        <h4 class="text-sm font-black text-primary tracking-tight">{{ act.message }}</h4>
                        <span class="text-[9px] font-bold text-muted uppercase tracking-widest opacity-40">{{ act.timestamp | date:'shortTime' }}</span>
                      </div>
                      <div class="flex items-center gap-3">
                        <span class="text-[9px] font-black text-muted uppercase tracking-widest opacity-30">{{ act.status }}</span>
                        <div class="w-1 h-1 bg-slate-200 rounded-full"></div>
                        <span class="text-[9px] font-black text-muted uppercase tracking-widest opacity-30">{{ act.type }} Operation</span>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </div>

        <!-- Inventory Insights Card -->
        <div class="pos-card p-12 border border-slate-100 bg-white grid grid-cols-1 lg:grid-cols-2 gap-16 relative shadow-sm">
           <div class="absolute inset-y-0 left-1/2 w-px bg-slate-50 hidden lg:block"></div>
           
           <!-- Top Performance -->
           <div>
              <h3 class="text-[10px] font-black text-muted uppercase tracking-[0.3em] opacity-50 mb-10">Top Performance</h3>
              <div class="space-y-6">
                 <div *ngFor="let prod of data.inventoryInsights.topSelling" class="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 group">
                    <div class="flex items-center gap-5">
                       <span class="text-[9px] font-black text-muted opacity-30 tracking-tighter">SKU {{ prod.sku }}</span>
                       <span class="text-sm font-black text-primary group-hover:translate-x-1 transition-transform tracking-tight">{{ prod.name }}</span>
                    </div>
                    <span class="px-3 py-1 bg-white rounded-lg border border-slate-100 text-[10px] font-black text-primary">₹{{ prod.sellingPrice | number:'1.0-0' }}</span>
                 </div>
                 <div *ngIf="!data.inventoryInsights.topSelling.length" class="text-xs font-bold text-muted uppercase tracking-[0.2em] opacity-40 py-10 text-center">No Performance Data</div>
              </div>
           </div>

           <!-- Low Stock Warning -->
           <div>
              <h3 class="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] opacity-60 mb-10">Low Stock Registry</h3>
              <div class="space-y-6">
                 <div *ngFor="let prod of data.inventoryInsights.lowStockItems" class="flex items-center justify-between p-4 bg-red-50/30 rounded-2xl border border-red-100/20 group">
                    <span class="text-sm font-black text-primary group-hover:translate-x-1 transition-transform tracking-tight">{{ prod.name }}</span>
                    <div class="flex items-center gap-3">
                       <span class="text-[8px] font-black text-muted uppercase tracking-wider opacity-40">Only</span>
                       <span class="px-3 py-1 bg-red-100/50 text-red-600 rounded-lg text-[10px] font-black">{{ prod.stock }} left</span>
                    </div>
                 </div>
                 <div *ngIf="!data.inventoryInsights.lowStockItems.length" class="text-xs font-bold text-muted uppercase tracking-[0.2em] opacity-40 py-10 text-center">Stock Healthy</div>
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Session Start Modal -->
    <div *ngIf="showModal" class="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div class="absolute inset-0 bg-primary/40 backdrop-blur-md" (click)="closeModal()"></div>
      <div class="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500 border border-slate-100">
        <div class="p-12 lg:p-16 space-y-12">
          <div class="text-center">
            <h3 class="text-4xl font-black text-primary tracking-tighter">Initialize POS Session</h3>
            <p class="text-sm font-bold text-muted uppercase tracking-[0.2em] mt-3 opacity-60">Bind Identity for Audit Integrity</p>
          </div>

          <div class="space-y-8">
            <div class="grid grid-cols-1 gap-6">
              <label class="text-[10px] font-black text-muted uppercase tracking-[0.3em] block mb-2 px-2">Available Operators</label>
              
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                <!-- Option: Current Admin -->
                <div 
                  (click)="selectedUserId = currentAdminId" 
                  [class.ring-2]="selectedUserId === currentAdminId"
                  [class.ring-accent]="selectedUserId === currentAdminId"
                  [class.bg-accent/5]="selectedUserId === currentAdminId"
                  class="p-6 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent group"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-xs font-black">AD</div>
                    <div>
                      <p class="text-sm font-black text-primary leading-none group-hover:text-accent transition-colors">Continue as Admin</p>
                      <p class="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Full Privileges</p>
                    </div>
                  </div>
                </div>

                <!-- Cashiers -->
                <div 
                  *ngFor="let user of cashiers"
                  (click)="selectedUserId = user.id" 
                  [class.ring-2]="selectedUserId === user.id"
                  [class.ring-accent]="selectedUserId === user.id"
                  [class.bg-accent/5]="selectedUserId === user.id"
                  class="p-6 bg-slate-50 rounded-3xl cursor-pointer hover:bg-slate-100 transition-all border border-transparent group"
                >
                  <div class="flex items-center gap-4">
                    <div class="w-10 h-10 rounded-full bg-slate-200 text-primary flex items-center justify-center text-xs font-black uppercase">
                      {{ user.userName.substring(0, 2) }}
                    </div>
                    <div>
                      <p class="text-sm font-black text-primary leading-none group-hover:text-accent transition-colors">{{ user.userName }}</p>
                      <p class="text-[10px] font-bold text-muted uppercase tracking-widest mt-1">Cashier Identity</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="sessionError" class="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-xs font-bold">
              {{ sessionError }}
            </div>
          </div>

          <div class="flex items-center gap-6 pt-4">
            <button (click)="closeModal()" class="flex-1 pos-btn border border-slate-200 py-5 text-sm font-black uppercase tracking-widest text-muted hover:bg-slate-50">Cancel</button>
            <button 
              (click)="startSession()" 
              [disabled]="!selectedUserId || sessionLoading"
              class="flex-[2] pos-btn pos-btn-primary py-5 text-sm font-black uppercase tracking-widest shadow-xl shadow-primary/20 disabled:opacity-50"
            >
              <span *ngIf="!sessionLoading">Launch POS Terminal</span>
              <div *ngIf="sessionLoading" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly userApi = inject(UserApi);
  private readonly authApi = inject(AuthApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly ctx = inject(StoreContextService);
  
  today = new Date();

  loading = signal(true);
  error = signal<string | null>(null);
  stats = signal<DashboardStats | null>(null);

  // Modal State
  showModal = false;
  sessionLoading = false;
  sessionError: string | null = null;
  cashiers: UserDto[] = [];
  selectedUserId: string | null = null;
  currentAdminId: string | null = null;

  constructor() {
    effect(() => {
      // Refresh when store selection changes
      const sid = this.ctx.selectedStoreId();
      this.refresh(sid);
    });
  }

  ngOnInit(): void {
    this.currentAdminId = this.auth.identity?.userId ?? null;
  }

  refresh(storeId?: string | null): void {
    this.loading.set(true);
    this.api.getDashboard(storeId ?? this.ctx.selectedStoreId()).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.error.set(res.message || 'Failed to load dashboard data');
        } else {
          this.stats.set(res.data);
          this.error.set(null);
        }
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Dashboard error:', err);
        this.error.set('Could not fetch dashboard metrics. Verify backend services are operational.');
        this.loading.set(false);
      }
    });
  }

  openSessionModal(): void {
    const storeId = this.ctx.selectedStoreId();
    if (!storeId) {
      this.error.set('Please select a store to initialize POS session.');
      return;
    }

    this.showModal = true;
    this.sessionLoading = true;
    this.selectedUserId = this.currentAdminId;

    this.userApi.getUsers({ storeId, role: 'Cashier', status: UserStatus.Active, pageSize: 50 }).subscribe({
      next: (res) => {
        this.cashiers = res.data?.items ?? [];
        this.sessionLoading = false;
      },
      error: () => {
        this.sessionError = 'Failed to load available operators.';
        this.sessionLoading = false;
      }
    });
  }

  closeModal(): void {
    this.showModal = false;
    this.sessionError = null;
    this.cashiers = [];
  }

  startSession(targetUserId?: string): void {
    const userId = targetUserId || this.auth.identity?.userId;
    if (!userId) return;

    const role = this.auth.role;
    const assignedStoreId = this.auth.identity?.storeId;
    const selectedStoreId = this.ctx.selectedStoreId();

    // 1. Logic for Cashier: Use assigned store
    if (role === 'Cashier') {
      if (!assignedStoreId) {
        this.sessionError = 'Access Denied: No store assigned to your profile.';
        return;
      }
      this.executeStartSession(userId, assignedStoreId);
      return;
    }

    // 2. Logic for Admin: Use selected store in header
    if (role === 'Admin' || role === 'Manager') {
      if (!selectedStoreId) {
        this.sessionError = 'Please select a store in the header to start a POS session.';
        // Optionally, we could flash the store picker here
        return;
      }
      this.executeStartSession(userId, selectedStoreId);
      return;
    }
  }

  private executeStartSession(userId: string, storeId: string): void {
    this.sessionLoading = true;
    this.sessionError = null;

    this.authApi.startSession({ userId, storeId }).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.sessionError = res.message || 'Failed to start session.';
          this.sessionLoading = false;
          return;
        }

        // IMPORTANT: We update the main identity with the POS session token
        // This switches the app state to POS mode
        const identity: AuthIdentity = {
          token: res.data.token,
          role: res.data.role ?? null,
          status: res.data.status ?? UserStatus.Active,
          storeId: res.data.storeId ?? null,
          userId: res.data.userId,
          email: res.data.email,
          sessionId: res.data.sessionId,
          terminalId: res.data.terminalId,
          mode: 'POS'
        };
        this.auth.persistIdentity(identity);
        
        // Success feedback and navigate
        this.sessionLoading = false;
        this.closeModal();
        void this.router.navigate(['/pos']);
      },
      error: (err) => {
        this.sessionError = err.error?.message || 'Network failure during session initialization.';
        this.sessionLoading = false;
      }
    });
  }

  goToPosTerminal(): void {
    // If it's a cashier, start immediately.
    // If it's admin, we might show the operator selection if they want to start for someone else,
    // otherwise just start for themselves.
    if (this.auth.role === 'Cashier') {
      this.startSession();
    } else {
      // For Admin, we still allow selecting a specific operator if needed,
      // but if they just want to "go to POS", they probably want to go as themselves.
      this.openSessionModal();
    }
  }

  navigateToRefunds(): void {
    this.router.navigate(['/admin/refund-requests']);
  }

  navigateToInventory(): void {
    this.router.navigate(['/admin/inventory']);
  }

  getTrendMax(trend: any[]): number {
    if (!trend?.length) return 100;
    return Math.max(...trend.map(d => d.revenue)) || 100;
  }
}



