import { Component, OnInit, OnDestroy, inject, signal, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { 
  ReportApi, 
  BillViewDto, 
  KpiSummaryDto, 
  SalesTrendPointDto, 
  ProductMetricDto, 
  RefundAnalyticsDto, 
  PaymentMethodDto,
  ReportFilter
} from '../../core/report.api';
import { StoreApi } from '../../core/store.api';
import { StoreContextService } from '../../core/store-context.service';
import { forkJoin, Subject, debounceTime, distinctUntilChanged, of, timer } from 'rxjs';
import { catchError, takeUntil, retry, delayWhen } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-10">
      
      <!-- Sticky Header & Filter Bar -->
      <div class="sticky top-0 z-30 -mx-6 lg:-mx-10 px-6 lg:px-10 py-6 bg-slate-50/80 backdrop-blur-xl border-b border-slate-200/50">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h2 class="text-3xl font-black text-primary tracking-tighter">Business Intelligence</h2>
            <p class="text-[10px] font-bold text-muted uppercase tracking-[0.2em] mt-1 opacity-60">
                Data for: <span class="text-accent">{{ ctx.selectedStoreId() ? 'Store Terminal' : 'Global Performance (All Stores)' }}</span>
            </p>
          </div>
          
          <div class="flex flex-wrap items-center gap-4">
            <!-- Date Range Selector -->
            <select 
                [(ngModel)]="datePreset" 
                (change)="onDatePresetChange()"
                class="bg-white border-slate-200 rounded-2xl py-3 px-4 text-[10px] font-black uppercase tracking-wider focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm cursor-pointer"
            >
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="custom">Custom Range</option>
            </select>

            <!-- Custom Date Range -->
            <div *ngIf="datePreset === 'custom'" class="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <input type="date" [(ngModel)]="startDate" (change)="onFilterChange()" class="bg-white border-slate-200 rounded-xl py-2 px-3 text-[10px] font-bold shadow-sm" />
                <span class="text-muted opacity-40 font-black">→</span>
                <input type="date" [(ngModel)]="endDate" (change)="onFilterChange()" class="bg-white border-slate-200 rounded-xl py-2 px-3 text-[10px] font-bold shadow-sm" />
            </div>

            <!-- Status Filter -->
            <select 
                [(ngModel)]="selectedStatus" 
                (change)="onFilterChange()"
                class="bg-white border-slate-200 rounded-2xl py-3 px-4 text-[10px] font-black uppercase tracking-wider focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all shadow-sm cursor-pointer"
            >
                <option value="">All Status</option>
                <option value="Finalized">Finalized</option>
                <option value="Refunded">Refunded</option>
                <option value="Cancelled">Cancelled</option>
            </select>

            <div class="flex items-center gap-2">
                <button (click)="loadAll()" [disabled]="loading()" class="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" [class.animate-spin]="loading()" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
                <button (click)="exportCsv()" [disabled]="exporting()" class="p-3 bg-primary text-white rounded-2xl hover:bg-primary-dark transition-all shadow-lg flex items-center gap-2 disabled:opacity-50">
                    <svg *ngIf="!exporting()" xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    <svg *ngIf="exporting()" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    <span class="text-[10px] font-black uppercase tracking-widest hidden md:inline">{{ exporting() ? 'Exporting...' : 'Export' }}</span>
                </button>
            </div>
          </div>
        </div>
      </div>

      <!-- KPI Summary Row -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
        <ng-container *ngIf="loading() || error(); else kpiContent">
            <div *ngFor="let i of [1,2,3,4,5,6,7]" class="pos-card p-6 bg-white border border-slate-100 min-h-[80px] flex flex-col justify-center">
                <div *ngIf="loading()" class="animate-pulse space-y-2">
                    <div class="h-2 w-12 bg-slate-100 rounded"></div>
                    <div class="h-6 w-24 bg-slate-100 rounded"></div>
                </div>
                <div *ngIf="error()" class="text-center">
                    <span class="text-[8px] font-black text-rose-500 uppercase opacity-40">Data Unavailable</span>
                </div>
            </div>
        </ng-container>
        <ng-template #kpiContent>
            <!-- Gross Revenue -->
            <div class="pos-card p-6 border border-slate-100 bg-white group hover:border-primary/30 transition-all">
                <span class="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Gross Sales</span>
                <div class="text-xl font-black text-primary tracking-tighter">₹{{ (kpi()?.grossRevenue || 0) | number:'1.0-0' }}</div>
            </div>
            <!-- Net Revenue -->
            <div class="pos-card p-6 bg-emerald-50 border border-emerald-100 relative group transition-all">
                <span class="text-[8px] font-black text-emerald-600/60 uppercase tracking-widest block mb-1">Net Revenue</span>
                <div class="text-xl font-black text-emerald-700 tracking-tighter">₹{{ (kpi()?.netRevenue || 0) | number:'1.0-0' }}</div>
                
                <!-- Revenue Impact Bar -->
                <div class="mt-3 h-1 w-full bg-emerald-200/50 rounded-full overflow-hidden">
                    <div class="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                         [style.width.%]="(kpi()?.grossRevenue || 0) > 0 ? ((kpi()?.netRevenue || 0) / (kpi()?.grossRevenue || 1)) * 100 : 0">
                    </div>
                </div>
                <div class="mt-1 flex justify-between text-[7px] font-black uppercase text-emerald-600/60">
                    <span>Retained</span>
                    <span>{{ (kpi()?.grossRevenue || 0) > 0 ? ((kpi()?.netRevenue || 0) / (kpi()?.grossRevenue || 1) * 100).toFixed(1) : 0 }}%</span>
                </div>
            </div>
            <!-- Orders -->
            <div class="pos-card p-6 border border-slate-100 bg-white">
                <span class="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Total Orders</span>
                <div class="text-xl font-black text-primary tracking-tighter">{{ kpi()?.totalOrders || 0 }}</div>
            </div>
            <!-- Avg Ticket -->
            <div class="pos-card p-6 border border-slate-100 bg-white">
                <span class="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Avg Ticket</span>
                <div class="text-xl font-black text-primary tracking-tighter">₹{{ (kpi()?.avgTicket || 0) | number:'1.0-0' }}</div>
            </div>
            <!-- Tax -->
            <div class="pos-card p-6 border border-slate-100 bg-white">
                <span class="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Tax Collected</span>
                <div class="text-xl font-black text-primary tracking-tighter">₹{{ (kpi()?.totalTax || 0) | number:'1.0-0' }}</div>
            </div>
            <!-- Refunds -->
            <div class="pos-card p-6 bg-rose-50 border border-rose-100 group transition-all relative">
                <span class="text-[8px] font-black text-rose-600/60 uppercase tracking-widest block mb-1">Refund Amount</span>
                <div class="text-xl font-black text-rose-700 tracking-tighter">₹{{ (kpi()?.refundAmount || 0) | number:'1.0-0' }}</div>
                
                <div class="mt-2 flex items-center justify-between">
                    <div class="text-[9px] font-black text-rose-600/60">
                        {{ kpi()?.refundRate || 0 | number:'1.1-1' }}% <span class="text-[7px] opacity-60">RATE</span>
                    </div>
                    <div class="text-[9px] font-black text-rose-600/60">
                        {{ kpi()?.cancelledOrders || 0 }} <span class="text-[7px] opacity-60">CASES</span>
                    </div>
                </div>

                <div class="absolute top-2 right-2 group-hover:block hidden bg-white text-[7px] font-bold p-1 rounded border border-rose-200 shadow-sm z-10">Based on approval date range</div>
                <div *ngIf="refunds()?.totalRefundAmount! > 0 && kpi()?.refundAmount === 0" class="mt-1 text-[7px] font-black text-rose-600 animate-bounce">⚠️ PERSISTENCE SYNC NEEDED</div>
            </div>
            <!-- Cancelled -->
            <div class="pos-card p-6 border border-slate-100 bg-white">
                <span class="text-[8px] font-black text-muted uppercase tracking-widest block mb-1">Cancelled</span>
                <div class="text-xl font-black text-primary tracking-tighter">{{ kpi()?.cancelledOrders || 0 }}</div>
            </div>
        </ng-template>
      </div>

      <!-- Sales Trend & Performance -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <!-- Sales Trend SVG Chart -->
        <div class="lg:col-span-8 space-y-4">
            <div class="pos-card p-8 border border-slate-100 bg-white min-h-[400px] flex flex-col">
                <div class="flex items-center justify-between mb-8">
                    <div>
                        <h3 class="text-xs font-black text-primary uppercase tracking-widest">Growth Analytics</h3>
                        <p class="text-[9px] font-bold text-muted uppercase tracking-widest opacity-40">Revenue vs Volume Distribution</p>
                    </div>
                    <div class="flex items-center gap-2 p-1 bg-slate-50 rounded-xl">
                        <button (click)="chartType.set('revenue')" [class]="chartType() === 'revenue' ? 'bg-white shadow-sm text-primary' : 'text-muted opacity-40'" class="px-4 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all">Revenue</button>
                        <button (click)="chartType.set('orders')" [class]="chartType() === 'orders' ? 'bg-white shadow-sm text-primary' : 'text-muted opacity-40'" class="px-4 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all">Orders</button>
                        <button (click)="chartType.set('refunds')" [class]="chartType() === 'refunds' ? 'bg-white shadow-sm text-primary' : 'text-muted opacity-40'" class="px-4 py-1.5 text-[8px] font-black uppercase rounded-lg transition-all">Refunds</button>
                    </div>
                </div>

                <div class="flex-grow relative flex items-center justify-center overflow-hidden">
                    <ng-container *ngIf="loading(); else chartContent">
                        <div class="w-full h-48 bg-slate-50 animate-pulse rounded-2xl flex items-center justify-center">
                            <span class="text-[10px] font-black text-slate-200 uppercase tracking-widest">Generating Projection...</span>
                        </div>
                    </ng-container>
                    <ng-template #chartContent>
                        <div *ngIf="trend().length === 0" class="text-center py-20">
                            <p class="text-[10px] font-black text-muted uppercase tracking-widest opacity-40 italic">No trend data for selected range</p>
                        </div>
                        <svg *ngIf="trend().length > 0" class="w-full h-full min-h-[300px]" viewBox="0 0 1000 300" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="rgb(var(--color-primary-rgb, 15, 23, 42))" stop-opacity="0.1" />
                                    <stop offset="100%" stop-color="rgb(var(--color-primary-rgb, 15, 23, 42))" stop-opacity="0" />
                                </linearGradient>
                            </defs>
                            <!-- Grid Lines -->
                            <line *ngFor="let i of [0,1,2,3]" x1="0" [attr.y1]="i*100" x2="1000" [attr.y2]="i*100" stroke="#f1f5f9" stroke-width="1" />
                            
                            <!-- Area -->
                            <path [attr.d]="trendPath(true)" fill="url(#chartGradient)" />
                            
                            <!-- Line -->
                            <path [attr.d]="trendPath(false)" fill="none" [attr.stroke]="getChartColor()" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="animate-in fade-in duration-1000" />
                            
                            <!-- Points -->
                            <circle *ngFor="let p of trendPoints()" [attr.cx]="p.x" [attr.cy]="p.y" r="4" [attr.fill]="getChartColor()" class="hover:r-6 cursor-pointer transition-all">
                                <title>{{ p.label }}: {{ chartType() === 'revenue' || chartType() === 'refunds' ? '₹' : '' }}{{ p.val }}</title>
                            </circle>
                        </svg>
                        
                        <!-- X-Axis Labels -->
                        <div *ngIf="trend().length > 0" class="flex justify-between w-full mt-4 px-2">
                            <span *ngFor="let p of trendLabels()" class="text-[7px] font-black text-muted uppercase tracking-tighter opacity-40">{{ p }}</span>
                        </div>
                    </ng-template>
                </div>
            </div>
            
            <!-- Transaction Ledger -->
            <div class="pos-card overflow-hidden border border-slate-100 bg-white">
                <div class="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <h3 class="text-xs font-black text-primary tracking-wider uppercase">Transaction Ledger</h3>
                    <div class="flex items-center gap-4">
                        <div class="relative">
                            <input type="text" [(ngModel)]="search" (ngModelChange)="onSearchChange($event)" placeholder="Search ID..." class="bg-slate-50 border-none rounded-xl py-1.5 pl-8 pr-3 text-[10px] font-bold w-40 focus:ring-1 focus:ring-primary/20" />
                            <svg class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                        <select [(ngModel)]="pageSize" (change)="onFilterChange()" class="text-[9px] font-bold border-none bg-slate-50 rounded-xl px-3 py-1.5 focus:ring-0">
                            <option [value]="10">10 Rows</option>
                            <option [value]="25">25 Rows</option>
                            <option [value]="50">50 Rows</option>
                        </select>
                    </div>
                </div>

                <div class="overflow-x-auto min-h-[300px]">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="bg-slate-50/50">
                                <th class="px-8 py-4 text-[8px] font-black text-muted uppercase tracking-widest">Bill ID</th>
                                <th class="px-8 py-4 text-[8px] font-black text-muted uppercase tracking-widest">Date</th>
                                <th class="px-8 py-4 text-[8px] font-black text-muted uppercase tracking-widest">Store</th>
                                <th class="px-8 py-4 text-[8px] font-black text-muted uppercase tracking-widest text-right">Amount</th>
                                <th class="px-8 py-4 text-[8px] font-black text-muted uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50">
                            <tr *ngIf="loading()">
                                <td colspan="5" class="p-8"><div class="space-y-4"><div *ngFor="let i of [1,2,3,4,5]" class="h-8 bg-slate-50 animate-pulse rounded-lg w-full"></div></div></td>
                            </tr>
                            <tr *ngFor="let sale of sales()" class="hover:bg-slate-50/30 transition-colors group">
                                <td class="px-8 py-4 text-[10px] font-black text-primary font-mono tracking-tighter">{{ sale.billNumber }}</td>
                                <td class="px-8 py-4">
                                    <div class="text-[9px] font-bold text-secondary">{{ sale.createdAt | date:'MMM dd, HH:mm' }}</div>
                                </td>
                                <td class="px-8 py-4 text-[9px] font-black text-primary uppercase">{{ sale.storeName || 'Terminal' }}</td>
                                <td class="px-8 py-4 text-[10px] font-black text-primary text-right">₹{{ sale.finalAmount | number:'1.2-2' }}</td>
                                <td class="px-8 py-4">
                                    <span class="text-[8px] font-black uppercase px-2 py-1 rounded-full tracking-widest"
                                        [ngClass]="{
                                            'bg-emerald-50 text-emerald-600': sale.status === 'Finalized',
                                            'bg-rose-50 text-rose-600': sale.status === 'Cancelled',
                                            'bg-amber-50 text-amber-600': sale.status === 'Refunded'
                                        }">{{ sale.status }}</span>
                                </td>
                            </tr>
                            <tr *ngIf="!loading() && sales().length === 0">
                                <td colspan="5" class="px-8 py-20 text-center italic text-muted text-[9px] font-bold opacity-40 uppercase">No transactions in selected range</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Pagination -->
                <div class="px-8 py-4 bg-slate-50/50 flex items-center justify-between border-t border-slate-50">
                    <span class="text-[8px] font-bold text-muted uppercase tracking-widest">Showing {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, totalCount()) }} of {{ totalCount() }}</span>
                    <div class="flex gap-2">
                        <button [disabled]="page === 1" (click)="onPageChange(page - 1)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <button [disabled]="page >= totalPages()" (click)="onPageChange(page + 1)" class="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 disabled:opacity-30 transition-all shadow-sm">
                            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Leaderboard & Analytics -->
        <div class="lg:col-span-4 space-y-6">
            <!-- Top Products -->
            <div class="pos-card p-8 border border-slate-100 bg-white">
                <h3 class="text-xs font-black text-primary tracking-widest uppercase mb-6 flex items-center justify-between">
                    Top Performance
                    <span class="text-[9px] text-muted opacity-40 font-bold lowercase tracking-normal italic">by net sales</span>
                </h3>
                <div class="space-y-4">
                    <div *ngFor="let prod of topProducts(); let i = index" class="space-y-1.5">
                        <div class="flex items-center justify-between">
                            <div class="text-[10px] font-black text-primary uppercase truncate pr-4">{{ prod.productName || 'Unknown Product' }}</div>
                            <div class="text-[9px] font-black text-primary">{{ prod.netQuantitySold }} <span class="opacity-30">Sold</span></div>
                        </div>
                        <div class="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div class="h-full bg-primary transition-all duration-1000" [style.width.%]="(prod.netQuantitySold / (topProducts()[0]?.netQuantitySold || 1)) * 100"></div>
                        </div>
                        <div class="flex justify-between items-center text-[7px] font-bold text-muted uppercase tracking-widest opacity-60">
                            <span>₹{{ prod.totalRevenue | number:'1.0-0' }} REV</span>
                            <span *ngIf="prod.refundCount > 0" class="text-rose-500">{{ prod.refundCount }} REFUNDED</span>
                        </div>
                    </div>
                    <div *ngIf="topProducts().length === 0" class="py-10 text-center italic text-muted text-[9px] font-bold opacity-40 uppercase">No product vectors</div>
                </div>
            </div>

            <!-- Refund Analytics -->
            <div class="pos-card border border-slate-100 bg-white overflow-hidden transition-all">
                <div class="p-8">
                    <div class="flex items-center justify-between mb-8">
                        <h3 class="text-xs font-black text-primary tracking-widest uppercase">Refund Analytics</h3>
                        <div class="flex flex-col items-end">
                            <span class="text-xs font-black text-rose-600">₹{{ (refunds()?.totalRefundAmount || 0) | number:'1.0-0' }}</span>
                            <span class="text-[7px] font-black text-rose-400 uppercase tracking-widest">Settled Impact</span>
                        </div>
                    </div>

                    <div class="space-y-6">
                        <!-- Top Refunded Products -->
                        <div class="space-y-4">
                            <span class="text-[8px] font-black text-muted uppercase tracking-widest block opacity-60">High Risk Products</span>
                            <div *ngFor="let p of refunds()?.topRefundedProducts" class="group/item">
                                <div class="flex justify-between items-end mb-1">
                                    <span class="text-[10px] font-black text-primary truncate max-w-[150px]">{{ p.productName }}</span>
                                    <span class="text-[9px] font-black text-primary">₹{{ p.refundAmount | number:'1.0-0' }}</span>
                                </div>
                                <div class="h-1 w-full bg-slate-50 rounded-full overflow-hidden">
                                    <div class="h-full bg-rose-500 rounded-full transition-all duration-1000" [style.width.%]="(refunds()?.totalRefundAmount || 0) > 0 ? (p.refundAmount / (refunds()?.totalRefundAmount || 1)) * 100 : 0"></div>
                                </div>
                                <div class="flex justify-between mt-1 text-[7px] font-bold text-rose-500/60 uppercase">
                                    <span>{{ p.refundCount }} CASES</span>
                                    <span>{{ (p.refundAmount / (refunds()?.totalRefundAmount || 1) * 100).toFixed(1) }}% IMPACT</span>
                                </div>
                            </div>
                        </div>

                        <!-- Reasons -->
                        <div class="space-y-3 pt-4 border-t border-slate-50">
                            <span class="text-[8px] font-black text-muted uppercase tracking-widest block opacity-60">Common Reasons</span>
                            <div *ngFor="let r of refunds()?.reasons" class="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-rose-50/50 transition-colors">
                                <span class="text-[9px] font-bold text-primary uppercase">{{ r.reason || 'Not Specified' }}</span>
                                <span class="text-[9px] font-black text-rose-600">{{ r.count }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Payment Breakdown -->
            <div class="pos-card p-8 border border-slate-100 bg-white">
                <h3 class="text-xs font-black text-primary tracking-widest uppercase mb-6">Liquidity Channels</h3>
                <div class="space-y-3">
                    <div *ngFor="let p of payments()" class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group hover:bg-primary hover:text-white transition-all cursor-default">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-slate-200 group-hover:border-white/20">
                                <span class="text-[9px] font-black uppercase text-primary group-hover:text-white">{{ (p.method || '-').substring(0,2) }}</span>
                            </div>
                            <div>
                                <div class="text-[10px] font-black uppercase tracking-tight">{{ p.method || 'Unknown' }}</div>
                                <div class="text-[8px] font-bold opacity-40 group-hover:opacity-60">{{ p.count }} TRANSACTIONS</div>
                            </div>
                        </div>
                        <div class="text-xs font-black">₹{{ p.amount | number:'1.0-0' }}</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; background-color: #f8fafc; min-height: 100vh; }
    .pos-card { @apply rounded-[2rem] transition-all; }
  `]
})
export class AdminReportsComponent implements OnInit, OnDestroy {
  private readonly api = inject(ReportApi);
  private readonly http = inject(HttpClient);
  protected readonly ctx = inject(StoreContextService);
  protected readonly Math = Math;

  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();

  // State Signals
  loading = signal(true);
  exporting = signal(false);
  error = signal<string | null>(null);
  
  kpi = signal<KpiSummaryDto | null>(null);
  trend = signal<SalesTrendPointDto[]>([]);
  sales = signal<BillViewDto[]>([]);
  topProducts = signal<ProductMetricDto[]>([]);
  refunds = signal<RefundAnalyticsDto | null>(null);
  payments = signal<PaymentMethodDto[]>([]);

  // Filter Models
  datePreset: 'today' | '7d' | '30d' | 'custom' = '7d';
  startDate = '';
  endDate = '';
  selectedStatus = '';
  search = '';
  pageSize = 10;
  page = 1;
  sortBy = 'date_desc';
  chartType = signal<'revenue' | 'orders' | 'refunds'>('revenue');

  totalCount = signal(0);
  totalPages = signal(0);

  constructor() {
    this.initDates();
    effect(() => {
        this.ctx.selectedStoreId();
        this.page = 1;
        this.loadAll();
    });
  }

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(() => this.onFilterChange());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initDates(): void {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    this.startDate = start.toISOString().split('T')[0];
    this.endDate = end.toISOString().split('T')[0];
  }

  onDatePresetChange(): void {
    const end = new Date();
    const start = new Date();
    if (this.datePreset === 'today') {
        this.startDate = end.toISOString().split('T')[0];
        this.endDate = end.toISOString().split('T')[0];
    } else if (this.datePreset === '7d') {
        start.setDate(end.getDate() - 6);
        this.startDate = start.toISOString().split('T')[0];
        this.endDate = end.toISOString().split('T')[0];
    } else if (this.datePreset === '30d') {
        start.setDate(end.getDate() - 29);
        this.startDate = start.toISOString().split('T')[0];
        this.endDate = end.toISOString().split('T')[0];
    }
    if (this.datePreset !== 'custom') this.onFilterChange();
  }

  onSearchChange(term: string): void { this.searchSubject.next(term); }
  onFilterChange(): void { this.page = 1; this.loadAll(); }
  onPageChange(p: number): void { this.page = p; this.loadAll(); }

  loadAll(): void {
    this.loading.set(true);
    this.error.set(null);
    const filter: ReportFilter = {
        startDate: this.startDate,
        endDate: this.endDate,
        storeId: this.ctx.selectedStoreId() || undefined,
        status: this.selectedStatus || undefined,
        search: this.search?.trim() || undefined,
        page: this.page,
        pageSize: this.pageSize,
        sortBy: this.sortBy,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    forkJoin({
        kpi: this.api.getKpiSummary(filter).pipe(retry({ count: 2, delay: 1000 })),
        trend: this.api.getSalesTrend(filter).pipe(retry({ count: 2, delay: 1000 })),
        sales: this.api.getSales(filter).pipe(retry({ count: 2, delay: 1000 })),
        top: this.api.getTopProducts(filter).pipe(retry({ count: 2, delay: 1000 })),
        refunds: this.api.getRefundAnalytics(filter).pipe(retry({ count: 2, delay: 1000 })),
        payments: this.api.getPaymentBreakdown(filter).pipe(retry({ count: 2, delay: 1000 }))
    }).pipe(
        catchError(err => {
            console.error('BI Dashboard sync failed', err);
            this.error.set('System synchronization failure. Please try again.');
            return of(null);
        })
    ).subscribe((res) => {
        if (!res) {
            this.loading.set(false);
            return;
        }
        this.kpi.set(res.kpi);
        this.trend.set(res.trend);
        this.topProducts.set(res.top);
        this.refunds.set(res.refunds);
        this.payments.set(res.payments);
        
        if (res.sales.success && res.sales.data) {
            this.sales.set(res.sales.data.items);
            this.totalCount.set(res.sales.data.totalCount);
            this.totalPages.set(res.sales.data.totalPages);
        } else if (res.sales.success === false) {
             this.error.set('Partial data load failure');
        }
        this.loading.set(false);
    });
  }

  exportCsv(): void {
    if (this.exporting()) return;
    this.exporting.set(true);

    const filter: ReportFilter = {
        startDate: this.startDate,
        endDate: this.endDate,
        storeId: this.ctx.selectedStoreId() || undefined,
        status: this.selectedStatus || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const url = this.api.getExportCsvUrl(filter);
    this.http.get(url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = `Report_${this.datePreset}_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
            this.exporting.set(false);
            window.dispatchEvent(new CustomEvent('app-toast', { 
                detail: { message: 'Report exported successfully', type: 'success' } 
            }));
        },
        error: () => {
            this.exporting.set(false);
            window.dispatchEvent(new CustomEvent('app-toast', { 
                detail: { message: 'Export failed. Please check connection.', type: 'error' } 
            }));
        }
    });
  }

  exportUrl(): string {
    return this.api.getExportCsvUrl({
        startDate: this.startDate,
        endDate: this.endDate,
        storeId: this.ctx.selectedStoreId() || undefined,
        status: this.selectedStatus || undefined,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  }

  // SVG Chart Logic
  trendPoints = computed(() => {
    const data = this.trend();
    if (!data.length) return [];
    const getter = (d: SalesTrendPointDto) => {
        if (this.chartType() === 'revenue') return d.revenue;
        if (this.chartType() === 'orders') return d.orders;
        return d.refunds;
    };
    const maxVal = Math.max(...data.map(d => getter(d)), 1);
    return data.map((d, i) => ({
        x: (i / (data.length - 1 || 1)) * 1000,
        y: 300 - ((getter(d) / maxVal) * 250),
        val: getter(d),
        label: d.label
    }));
  });

  getChartColor(): string {
    if (this.chartType() === 'revenue') return '#0f172a';
    if (this.chartType() === 'orders') return '#fbbf24';
    return '#e11d48'; // rose-600
  }

  trendPath(isArea: boolean): string {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
        const cp1x = pts[i-1].x + (pts[i].x - pts[i-1].x) / 2;
        path += ` C ${cp1x} ${pts[i-1].y}, ${cp1x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    if (isArea) {
        path += ` L ${pts[pts.length-1].x} 300 L ${pts[0].x} 300 Z`;
    }
    return path;
  }

  trendLabels(): string[] {
    const data = this.trend();
    if (data.length <= 10) return data.map(d => d.label);
    return data.filter((_, i) => i % Math.floor(data.length / 8) === 0).map(d => d.label);
  }
}
