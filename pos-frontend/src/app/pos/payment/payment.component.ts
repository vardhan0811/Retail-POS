import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject, PLATFORM_ID, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { BillApi, BillDto, CreatePaymentRequest, ReceiptDto } from '../../core/bill.api';
import { CartService } from '../cart/cart.service';
import { LastBillPersistence } from '../state/last-bill.persistence';
import { ToastService } from '../../core/toast.service';
import { PrintService } from '../../core/print.service';
import { Observable, of, Subject, timer, interval, Subscription } from 'rxjs';
import { takeUntil, finalize, map, take } from 'rxjs/operators';

type PaymentState = 'idle' | 'loading_payment' | 'awaiting_payment_input' | 'processing_payment' | 'completed' | 'failed' | 'stalled';
type TenderMethod = 'Cash' | 'Card' | 'UPI' | 'Split';
type VoidReason = 'Customer Changed Mind' | 'Incorrect Item/Price' | 'Payment Method Failed' | 'System Error' | 'Other';

interface PartialTender {
  method: TenderMethod;
  amount: number;
  timestamp: Date;
}

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="h-screen bg-slate-50/30 flex flex-col overflow-hidden select-none font-sans text-slate-900">
      
      <!-- OPERATOR STATUS BAR (ULTRA COMPACT) -->
      <div class="h-8 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-50">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-1.5">
            <div class="w-1 h-1 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></div>
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-400">Terminal Connected</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-300">Node:</span>
            <span class="text-[8px] font-black uppercase tracking-widest text-slate-600">SECURE-POS-01</span>
          </div>
        </div>
        <div class="flex items-center gap-4">
           <span class="text-[8px] font-black text-slate-900/40 uppercase tracking-widest">{{ today | date:'dd MMM yyyy' }}</span>
           <span class="text-[8px] font-black text-emerald-600 uppercase tracking-widest">{{ today | date:'HH:mm:ss' }}</span>
        </div>
      </div>

      <!-- MAIN WORKSPACE -->
      <div class="flex-1 flex overflow-hidden">
        
        <!-- LEFT: INTELLIGENT TRANSACTION CONTROL PANEL -->
        <div class="w-[38%] flex flex-col border-r border-slate-200 bg-white relative overflow-hidden">
           
           <!-- OPERATIONAL STATUS BAR (HEADER) -->
           <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div class="flex items-center gap-4">
                 <div class="flex flex-col">
                    <h2 class="text-xs font-black tracking-widest text-slate-900 uppercase">Transaction Control</h2>
                    <div class="flex items-center gap-1.5 mt-0.5">
                       <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                       <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">LIVE / {{ cashierName }} / {{ terminalId }}</span>
                    </div>
                 </div>
              </div>
              <div class="flex items-center gap-3">
                <div class="flex flex-col items-end mr-1">
                   <span class="text-[7px] font-black text-slate-300 uppercase tracking-widest">Order ID</span>
                   <span class="text-[10px] font-black text-slate-900 tracking-tight">#{{ bill?.billNumber?.slice(-8) }}</span>
                </div>
                <button *ngIf="state !== 'completed'" (click)="showVoidConfirmation = true" class="w-8 h-8 rounded-xl bg-red-50 text-red-400 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all">
                   <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
           </div>

           <!-- TRANSACTION BODY (ITEM FEED & AUDIT) -->
           <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar">
              
              <!-- ITEMIZED AUDIT -->
              <div class="space-y-1">
                 <div class="flex items-center justify-between mb-4">
                    <span class="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Cart Audit ({{ bill?.items?.length || 0 }})</span>
                    <span class="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-widest">Validated</span>
                 </div>
                 <div *ngFor="let item of bill?.items" class="flex items-center gap-4 py-2 group">
                    <div class="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-slate-900 group-hover:text-white transition-all duration-300">
                       <span class="text-[10px] font-black">{{ item.quantity }}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                       <div class="flex justify-between items-baseline">
                          <h4 class="text-[10px] font-black text-slate-900 truncate uppercase tracking-tight">{{ item.productName }}</h4>
                          <span class="text-[10px] font-black text-slate-900">₹{{ item.totalPrice | number:'1.2-2' }}</span>
                       </div>
                       <div class="flex items-center gap-2 mt-0.5">
                          <span class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Rate: ₹{{ item.unitPrice }}</span>
                          <span class="text-[8px] font-black text-slate-300 uppercase">/</span>
                          <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Tax: 18%</span>
                       </div>
                    </div>
                 </div>
              </div>

              <!-- RECEIPT PREVIEW -->
              <div class="relative">
                 <div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3 text-[7px] font-black text-slate-300 uppercase tracking-[0.3em] z-10">Thermal Preview</div>
                 <div class="bg-slate-50 border-x border-slate-100 p-6 rounded-sm shadow-inner relative overflow-hidden">
                    <div class="absolute top-0 left-0 right-0 h-1 bg-[radial-gradient(circle_at_center,_#fff_1px,_transparent_0)] bg-[length:4px_4px]"></div>
                    <div class="flex flex-col items-center text-center mb-4">
                        <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-8 h-8 object-contain mb-2" alt="Logo">
                       <span class="text-[9px] font-black text-slate-900 uppercase tracking-[0.15em]">Retail POS Hub</span>
                    </div>
                    <div class="space-y-1.5 border-t border-slate-200 pt-4 mb-4 font-mono">
                       <div class="flex justify-between text-[8px] text-slate-600 uppercase"><span>Subtotal</span><span>₹{{ subtotal | number:'1.2-2' }}</span></div>
                       <div class="flex justify-between text-[8px] text-slate-600 uppercase"><span>CGST (9%)</span><span>₹{{ cgst | number:'1.2-2' }}</span></div>
                       <div class="flex justify-between text-[8px] text-slate-600 uppercase"><span>SGST (9%)</span><span>₹{{ sgst | number:'1.2-2' }}</span></div>
                    </div>
                    <div class="flex justify-between items-end border-t border-slate-900 pt-2 font-mono">
                       <span class="text-[9px] font-black text-slate-900 uppercase">Payable</span>
                       <span class="text-xs font-black text-slate-900">₹{{ remainingToSettle | number:'1.2-2' }}</span>
                    </div>
                 </div>
              </div>
           </div>

           <!-- SUMMARY TOTALS -->
           <div class="p-6 bg-slate-900 text-white shrink-0">
              <div class="flex items-end justify-between">
                 <div class="flex flex-col">
                    <span class="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em] mb-1">Grand Settlement</span>
                    <div class="flex items-baseline gap-1.5">
                       <span class="text-sm font-black text-white/30 uppercase">₹</span>
                       <span class="text-5xl font-black tracking-tighter leading-none">{{ currentPayableAmount | number:'1.2-2' }}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        <!-- RIGHT: OPERATOR CONSOLE -->
        <div class="flex-1 flex flex-col bg-slate-50/50 overflow-hidden relative">
           
           <!-- TENDER MODE SWITCHER -->
           <div class="px-6 pt-6 shrink-0 z-10">
             <div class="bg-white p-1.5 rounded-[1.25rem] border border-slate-200 shadow-sm flex items-stretch h-20 gap-1.5">
                <button *ngFor="let type of tenderTypes" 
                        (click)="selectMethod(type.id)"
                        class="flex-1 rounded-xl flex items-center px-4 gap-4 transition-all relative overflow-hidden group border border-transparent"
                        [class]="selectedMethod === type.id ? 'bg-slate-900 text-white shadow-xl scale-[1.02] z-10' : 'hover:bg-slate-50 hover:border-slate-100 text-slate-400'">
                   <div class="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
                        [class]="selectedMethod === type.id ? 'bg-white/10 ring-1 ring-white/20' : 'bg-slate-50 group-hover:bg-white border border-slate-100'">
                      <svg *ngIf="type.icon === 'drawer'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      <svg *ngIf="type.icon === 'terminal'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
                      <svg *ngIf="type.icon === 'qr'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                      <svg *ngIf="type.icon === 'split'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                   </div>
                   <div class="flex flex-col items-start">
                      <span class="text-[11px] font-black uppercase tracking-widest leading-none mb-1.5">{{ type.label }}</span>
                      <span class="text-[8px] font-bold uppercase tracking-tight opacity-50">{{ type.subtitle }}</span>
                   </div>
                </button>
             </div>
           </div>

           <!-- TENDER WORKSPACE -->
           <div class="flex-1 flex items-center justify-center p-6 min-h-0 overflow-hidden relative">
               
               <!-- GLOBAL PROCESSING OVERLAY (WAVE LOADER) -->
               <div *ngIf="state === 'processing_payment'" class="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center animate-in fade-in duration-300">
                  <div class="flex items-end gap-1.5 h-12 mb-6">
                     <div class="wave-bar" [style.animation-delay]="'0ms'"></div>
                     <div class="wave-bar" [style.animation-delay]="'150ms'"></div>
                     <div class="wave-bar" [style.animation-delay]="'300ms'"></div>
                     <div class="wave-bar" [style.animation-delay]="'450ms'"></div>
                  </div>
                  <span class="text-xs font-black text-slate-900 uppercase tracking-[0.3em] animate-pulse">{{ loadingMessage }}</span>
               </div>

               <!-- CASH VIEW -->
               <div *ngIf="selectedMethod === 'Cash' && state !== 'processing_payment'" class="w-full max-w-2xl flex items-stretch gap-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div class="flex-1 flex flex-col gap-4">
                    <div class="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm card-hover">
                      <div class="grid grid-cols-3 gap-2">
                         <button *ngFor="let k of keypadKeys" (click)="onKeyPress(k)" class="h-16 rounded-2xl bg-slate-50 border border-slate-100 text-xl font-black text-slate-900 transition-all active:scale-90 active:bg-slate-900 active:text-white flex items-center justify-center btn-active">
                            {{ k }}
                         </button>
                      </div>
                    </div>
                    <button (click)="setExactCash()" class="h-16 bg-slate-900 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-xl transition-all btn-active">Exact Cash Tendered</button>
                  </div>
                  <div class="w-80 flex flex-col gap-6">
                    <div class="grid grid-cols-2 gap-2">
                       <button *ngFor="let d of denominations" (click)="addDenomination(d)" class="h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black text-slate-900 card-hover btn-active">₹{{ d }}</button>
                    </div>
                    <div class="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden p-6 card-hover">
                       <div class="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest"><span>Bill Amount</span><span class="text-slate-900">₹{{ currentPayableAmount | number:'1.2-2' }}</span></div>
                       <div class="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest my-4"><span>Tendered</span><span class="text-emerald-600">₹{{ tenderedAmount || '0.00' }}</span></div>
                       <div class="h-px bg-slate-100 mb-4"></div>
                       <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Return to Customer</span>
                       <div class="text-4xl font-black tracking-tighter text-slate-900">₹{{ (changeDue >= 0 ? changeDue : 0) | number:'1.2-2' }}</div>
                    </div>
                  </div>
               </div>

               <!-- CARD VIEW -->
               <div *ngIf="selectedMethod === 'Card' && state !== 'processing_payment'" class="w-full max-w-sm flex flex-col items-center gap-10 animate-in slide-in-from-bottom-6 duration-500">
                  <div class="w-48 h-72 bg-[#1e293b] rounded-[2.5rem] p-5 flex flex-col gap-5 shadow-2xl relative border-[3px] border-slate-800 card-hover">
                     <div class="flex-1 bg-[#0f172a] rounded-2xl border border-slate-700/50 p-4 flex flex-col items-center justify-center text-center overflow-hidden">
                        
                        <div *ngIf="terminalStatus === 'connecting' || terminalStatus === 'authorizing'" class="relative flex items-center justify-center mb-6">
                           <div class="absolute w-12 h-12 border-2 border-emerald-500/20 rounded-full animate-ping"></div>
                           <div class="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>

                        <div *ngIf="terminalStatus === 'approved'" class="success-check bg-emerald-500 w-12 h-12 rounded-full flex items-center justify-center text-white mb-4">
                           <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>

                        <span class="text-[10px] font-black uppercase tracking-[0.2em]" [class.text-emerald-500]="terminalStatus === 'approved'" [class.text-slate-400]="terminalStatus !== 'approved'">{{ terminalMessage }}</span>
                     </div>
                  </div>
               </div>

               <!-- UPI QR VIEW -->
               <div *ngIf="selectedMethod === 'UPI' && state !== 'processing_payment'" class="w-full max-w-md flex flex-col items-center gap-6 animate-in slide-in-from-bottom-8 duration-500">
                  <div class="bg-white w-full rounded-[2.5rem] border border-slate-200 shadow-2xl p-10 flex flex-col items-center gap-8 card-hover" [class.qr-pulse]="upiStep === 'waiting'">
                     
                     <div class="text-center" [class.opacity-30]="upiStep === 'success'">
                        <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest">BHIM UPI</p>
                        <h4 class="text-xs font-black text-slate-900 uppercase">Secure Retail POS</h4>
                     </div>

                     <div class="w-44 h-44 bg-slate-50 rounded-2xl flex items-center justify-center relative border-2 border-slate-100 shadow-inner overflow-hidden">
                        
                        <!-- QR Success State -->
                        <div *ngIf="upiStep === 'success'" class="absolute inset-0 z-10 bg-emerald-500 flex flex-col items-center justify-center text-white animate-in zoom-in duration-300">
                           <div class="success-check w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-3">
                              <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>
                           </div>
                           <span class="text-[10px] font-black uppercase tracking-widest">Success</span>
                        </div>

                        <svg class="w-36 h-36" [class.text-slate-200]="upiStep !== 'success'" [class.opacity-10]="upiStep === 'success'" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm1.5 1.5v5h5v-5h-5zM3 13h8v8H3v-8zm1.5 1.5v5h5v-5h-5zM13 3h8v8h-8V3zm1.5 1.5v5h5v-5h-5zM13 13h2v2h-2v-2zm2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm0-2h2v2h-2v-2zm-2-2h2v2h-2v-2zm0 4h2v2h-2v-2zM13 15h2v2h-2v-2zm2 2h2v2h-2v-2zm0-4h2v2h-2v-2z"/></svg>
                        
                        <div *ngIf="upiStep === 'waiting'" class="absolute inset-x-0 h-1 bg-violet-600 top-0 animate-qr-scan shadow-[0_0_10px_rgba(124,58,237,0.5)]"></div>
                     </div>

                     <div class="flex flex-col items-center gap-1" [class.opacity-20]="upiStep === 'success'">
                        <span class="text-[10px] font-black text-violet-600 tracking-widest">Waiting for payment...</span>
                        <span class="text-[8px] font-bold text-slate-400 uppercase">Expires in {{ upiTimer }}s</span>
                     </div>
                  </div>
               </div>

               <!-- SPLIT VIEW -->
               <div *ngIf="selectedMethod === 'Split' && state !== 'processing_payment'" class="w-full max-w-xl flex flex-col gap-4 animate-in fade-in duration-300 h-full max-h-[440px]">
                  <div class="bg-white rounded-3xl border border-slate-200 shadow-sm p-4 flex items-center justify-between gap-6 shrink-0 card-hover">
                     <div class="flex-1"><div class="flex items-center justify-between mb-2"><span class="text-[9px] font-black uppercase tracking-widest text-slate-900">Split Progress</span><span class="text-[10px] font-black text-emerald-600">{{ splitProgressPercent | number:'1.0-0' }}%</span></div><div class="h-2 bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-emerald-500 transition-all duration-500" [style.width.%]="splitProgressPercent"></div></div></div>
                  </div>
                  <div class="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden flex flex-col flex-1 card-hover">
                     <div class="p-4 space-y-3 overflow-y-auto custom-scrollbar">
                        <div *ngFor="let p of partialPayments; let idx = index" class="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200/50 animate-in slide-in-from-bottom-2">
                           <span class="text-[10px] font-black uppercase">{{ p.method }}</span>
                           <div class="flex items-center gap-5"><span class="text-xs font-black">₹{{ p.amount | number:'1.2-2' }}</span><button (click)="removePartial(idx)" class="text-red-300 hover:text-red-500 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button></div>
                        </div>
                     </div>
                     <div class="p-5 bg-slate-900 text-white flex justify-between"><span>Rem. Balance</span><span class="font-black">₹{{ remainingToSettle | number:'1.2-2' }}</span></div>
                  </div>
                  <div class="flex gap-3"><input type="number" [(ngModel)]="splitAmount" class="flex-1 h-12 bg-white border border-slate-200 rounded-2xl px-5 text-xs font-black outline-none focus:ring-2 focus:ring-slate-900 transition-all" placeholder="Amount"><button (click)="addToSplit()" class="h-12 w-20 bg-slate-900 text-white rounded-2xl flex items-center justify-center btn-active">ADD</button></div>
               </div>
           </div>

           <!-- ACTION BAR -->
           <div class="px-6 pb-6 shrink-0 z-10">
              <div class="bg-white border border-slate-200 rounded-[2rem] shadow-xl overflow-hidden flex items-stretch h-18">
                 <div class="flex flex-col justify-center px-8 border-r border-slate-100 bg-slate-50/50 min-w-[180px]">
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.25em] mb-1">Payable</span>
                    <span class="text-2xl font-black text-slate-900 tracking-tighter">₹{{ (selectedMethod === 'Split' ? remainingToSettle : currentPayableAmount) | number:'1.2-2' }}</span>
                 </div>
                 <button (click)="handlePrimaryAction()" [disabled]="!isTenderValid || state === 'processing_payment'" class="flex-1 bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-[11px] hover:bg-slate-800 disabled:opacity-20 transition-all">
                    {{ ctaLabel }}
                 </button>
              </div>
           </div>
        </div>
      </div>

      <!-- PREMIUM SUCCESS VIEW: ONE-CLICK SMART BILLING -->
      <div *ngIf="state === 'completed'" class="h-full flex items-center justify-center p-12 bg-[#0a0f18] animate-in fade-in duration-700 absolute inset-0 z-[200]">
         
         <!-- BACKGROUND GLOW EFFECTS -->
         <div class="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none"></div>
         <div class="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none"></div>

         <div class="max-w-6xl w-full flex items-center gap-24 relative z-10">
            
            <!-- LEFT SIDE: THERMAL RECEIPT PREVIEW -->
            <div class="w-[380px] shrink-0 animate-in zoom-in slide-in-from-left-12 duration-1000 delay-150 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
               <div class="relative group">
                  <!-- Receipt Glow -->
                  <div class="absolute -inset-1 bg-white/5 rounded-[2.5rem] blur-xl group-hover:bg-emerald-500/10 transition-all duration-500"></div>
                  
                  <!-- Actual Slip Card -->
                  <div class="relative bg-white rounded-[2rem] shadow-2xl overflow-hidden transform hover:scale-[1.02] transition-transform duration-500 card-hover">
                     <!-- Decorative Zig-Zag Edge -->
                     <div class="absolute top-0 left-0 right-0 h-2 bg-[radial-gradient(circle_at_center,_#f1f5f9_2px,_transparent_0)] bg-[length:6px_6px] bg-repeat-x opacity-30"></div>
                     
                     <div class="p-10 pt-12">
                        <!-- Bull Logo & Brand -->
                        <div class="flex flex-col items-center text-center mb-8">
                            <img src="https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png" class="w-20 h-20 object-contain mb-3" alt="Retail POS Logo">
                           <h3 class="text-sm font-black uppercase tracking-widest">RETAIL POS</h3>
                           <p class="text-[9px] font-bold text-slate-400 mt-1">TERMINAL: {{ terminalId }}</p>
                        </div>

                        <div class="border-t border-dashed border-slate-200 my-6"></div>

                        <!-- Items Feed -->
                        <div class="space-y-4 mb-8">
                           <div *ngFor="let item of bill?.items" class="flex flex-col">
                              <div class="flex justify-between items-start">
                                 <span class="text-[11px] font-black uppercase leading-tight max-w-[180px]">{{ item.productName }}</span>
                                 <span class="text-[11px] font-black">₹{{ item.totalPrice | number:'1.2-2' }}</span>
                              </div>
                              <div class="text-[9px] text-slate-400 mt-1">
                                 {{ item.quantity }} × ₹{{ item.unitPrice | number:'1.2-2' }}
                              </div>
                           </div>
                        </div>

                        <div class="border-t border-dashed border-slate-200 my-6"></div>

                        <!-- Grand Total -->
                        <div class="flex flex-col">
                           <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Final Total</span>
                           <div class="flex justify-between items-center">
                              <span class="text-4xl font-black tracking-tighter">₹{{ bill?.finalAmount | number:'1.2-2' }}</span>
                              <div class="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                 <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                                 </svg>
                              </div>
                           </div>
                        </div>

                        <div class="mt-10 text-center">
                           <p class="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em]">Thank You</p>
                        </div>
                     </div>
                  </div>
               </div>
            </div>

            <!-- RIGHT SIDE: STATUS & ACTION -->
            <div class="flex-1 flex flex-col items-start animate-in slide-in-from-right-12 duration-1000 delay-300">
               <div class="mb-12">
                  <h2 class="text-7xl font-black text-white/10 uppercase tracking-tighter mb-2 leading-none select-none">Transaction</h2>
                  <h2 class="text-8xl font-black text-emerald-500 uppercase tracking-tighter leading-none">Finalized</h2>
               </div>

               <div class="flex items-center gap-4 mb-16 px-4 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-md">
                  <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Cloud Sync: <span class="text-white">Active</span></span>
                  <div class="w-px h-4 bg-white/10 mx-2"></div>
                  <span class="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Store: <span class="text-white">{{ cashierName }}</span></span>
               </div>

               <!-- THE ONE BUTTON: SMART BILLING -->
                <div class="w-full max-w-lg relative group">
                   <!-- Button Glow -->
                   <div class="absolute -inset-1 bg-emerald-500 rounded-full blur-xl opacity-25 group-hover:opacity-50 transition-opacity duration-500"></div>
                   
                   <button (click)="startSmartBilling()" 
                           [disabled]="isProcessingSmart"
                           class="relative w-full h-24 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full flex items-center justify-center gap-6 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all duration-300 group overflow-hidden btn-active">
                      
                      <!-- Ripple Effect Container -->
                      <div class="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out pointer-events-none"></div>
 
                      <div *ngIf="!isProcessingSmart" class="flex items-center gap-6 animate-in zoom-in duration-300">
                         <div class="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm shadow-inner">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                               <path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                         </div>
                         <span class="text-2xl font-black text-white uppercase tracking-[0.1em]">Print & Send Receipt</span>
                      </div>
 
                      <!-- Processing Animation (Wave) -->
                      <div *ngIf="isProcessingSmart" class="flex items-center gap-6 animate-in fade-in zoom-in duration-300">
                         <div class="flex items-end gap-1.5 h-6">
                            <div class="wave-bar bg-white/60" [style.animation-delay]="'0ms'"></div>
                            <div class="wave-bar bg-white/60" [style.animation-delay]="'150ms'"></div>
                            <div class="wave-bar bg-white/60" [style.animation-delay]="'300ms'"></div>
                         </div>
                         <span class="text-xl font-black text-white uppercase tracking-widest">{{ smartStatusMessage }}</span>
                      </div>
                   </button>
                </div>

               <!-- SECONDARY ACTION: START NEXT ORDER (KEYBOARD N) -->
               <button (click)="nextOrder()" class="mt-8 px-8 py-3 rounded-full text-slate-500 hover:text-white hover:bg-white/5 transition-all text-xs font-black uppercase tracking-[0.3em]">
                  Start Next Order <span class="opacity-30 ml-2">(N)</span>
               </button>
            </div>
         </div>
      </div>


      <!-- STEP 1: DIGITAL RECEIPT MODAL (DARK THEME) -->
      <div *ngIf="showEmailModal" class="fixed inset-0 bg-[#0a0f18]/95 backdrop-blur-2xl z-[300] flex items-center justify-center p-4 animate-in fade-in duration-300">
         <div class="bg-[#111827] border border-white/10 rounded-[3rem] w-full max-w-md p-12 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.8)] relative overflow-hidden">
            <!-- Decorative Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl"></div>

            <div class="relative z-10">
               <div class="w-20 h-20 rounded-3xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-10 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>
               </div>

               <h3 class="text-3xl font-black text-white mb-3 uppercase tracking-tighter">Digital Receipt</h3>
               <p class="text-xs font-bold text-slate-500 uppercase tracking-widest mb-10 leading-relaxed">Enter customer email to automate digital delivery.</p>
               
               <div class="space-y-8">
                  <div class="relative">
                     <input type="email" 
                            [(ngModel)]="customerEmail" 
                            placeholder="customer@example.com"
                            [disabled]="isProcessingSmart"
                            class="w-full h-18 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-base font-bold text-white outline-none focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-slate-600 disabled:opacity-50">
                     <div class="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase tracking-widest">Optional</div>
                  </div>

                  <!-- Processing Status -->
                  <div *ngIf="isProcessingSmart" class="flex items-center gap-3 px-2">
                    <div class="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
                    <span class="text-xs font-black text-emerald-400 uppercase tracking-widest">{{ smartStatusMessage }}</span>
                  </div>

                  <div class="flex gap-4">
                     <button (click)="skipAndPrint()"
                             [disabled]="isProcessingSmart"
                             class="flex-1 h-18 py-4 text-xs font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-white/5 rounded-2xl transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        Skip & Print
                     </button>
                     <button (click)="confirmBilling()"
                             [disabled]="isProcessingSmart"
                             class="flex-1 py-4 h-18 bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center group disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100">
                        <span>{{ isProcessingSmart ? 'Processing...' : 'Continue' }}</span>
                        <svg *ngIf="!isProcessingSmart" class="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                     </button>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- VOID MODAL -->
      <div *ngIf="showVoidConfirmation" class="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
         <div class="bg-white rounded-3xl w-full max-w-xs p-8 shadow-2xl animate-in zoom-in-95">
            <h3 class="text-base font-black text-slate-900 mb-1 uppercase tracking-tighter">Void Transaction?</h3>
            <div class="flex gap-3 mt-8">
               <button (click)="showVoidConfirmation = false" class="flex-1 h-12 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-50 rounded-xl transition-colors">Resume</button>
               <button (click)="cancelWithConfirm()" class="flex-1 h-12 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all">Void Bill</button>
            </div>
         </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
    @keyframes qr-scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
    .animate-qr-scan { animation: qr-scan 3s ease-in-out infinite; }
    
    /* Animation Utilities */
    .animate-in { animation-duration: 400ms; animation-fill-mode: both; }
    .fade-in { animation-name: fadeIn; }
    .zoom-in { animation-name: zoomIn; }
    .slide-in-from-left-12 { animation-name: slideInLeft12; }
    .slide-in-from-right-12 { animation-name: slideInRight12; }
    .slide-in-from-bottom-2 { animation-name: slideInBottom2; }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes zoomIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes slideInLeft12 { from { opacity: 0; transform: translateX(-48px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInRight12 { from { opacity: 0; transform: translateX(48px); } to { opacity: 1; transform: translateX(0); } }
    @keyframes slideInBottom2 { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    
    .delay-150 { animation-delay: 150ms; }
    .delay-300 { animation-delay: 300ms; }

    /* Payment Specific Animations */
    @keyframes qrPulse { 0% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(124, 58, 237, 0); } 100% { box-shadow: 0 0 0 0 rgba(124, 58, 237, 0); } }
    .qr-pulse { animation: qrPulse 2s infinite; }

    @keyframes loaderPulse { 0% { transform: scale(0.95); opacity: 0.5; } 50% { transform: scale(1.05); opacity: 1; } 100% { transform: scale(0.95); opacity: 0.5; } }
    .loader-pulse { animation: loaderPulse 1.5s ease-in-out infinite; }

    @keyframes successCheck { 0% { transform: scale(0.5); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
    .success-check { animation: successCheck 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

    @keyframes rippleEffect { 0% { transform: scale(1); opacity: 0.4; } 100% { transform: scale(2.5); opacity: 0; } }
    .ripple { position: absolute; border-radius: 50%; background: #10b981; animation: rippleEffect 1s ease-out forwards; }

    @keyframes wavePulse { 0% { height: 8px; } 50% { height: 32px; } 100% { height: 8px; } }
    .wave-bar { width: 4px; background: #10b981; border-radius: 2px; animation: wavePulse 1s ease-in-out infinite; }

    /* Micro-interactions */
    .btn-active:active { transform: scale(0.95); }
    .card-hover:hover { transform: translateY(-4px); transition: transform 0.3s ease; }
  `]
})
export class PaymentComponent implements OnInit, OnDestroy {
  bill: BillDto | null = null;
  state: PaymentState = 'idle';
  loadingMessage = 'Connecting...';
  today = new Date();
  printStatus: 'idle' | 'printing' | 'success' | 'failed' = 'idle';
  emailStatus: 'idle' | 'sending' | 'success' | 'failed' = 'idle';
  pdfStatus: 'idle' | 'generating' | 'success' | 'failed' = 'idle';
  lastPrintTime?: Date;
  lastEmailRecipient?: string;
  selectedMethod: TenderMethod = 'Cash';
  tenderedAmount: number = 0;
  changeDue: number = 0;
  denominations = [10, 20, 50, 100, 200, 500, 2000];
  tenderTypes = [
    { id: 'Cash', label: 'Cash', subtitle: 'Instant', icon: 'drawer' },
    { id: 'Card', label: 'Card', subtitle: 'Terminal', icon: 'terminal' },
    { id: 'UPI', label: 'UPI QR', subtitle: 'Digital', icon: 'qr' },
    { id: 'Split', label: 'Split', subtitle: 'Multi', icon: 'split' },
  ];
  keypadKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', 'C'];
  terminalStatus: 'ready' | 'connecting' | 'authorizing' | 'approved' = 'ready';
  terminalMessage: string = 'Ready';
  detectedCardBrand: string | null = null;
  upiStep: 'idle' | 'generating' | 'waiting' | 'success' = 'idle';
  upiTimer = 180;
  upiTimerSub?: Subscription;
  partialPayments: PartialTender[] = [];
  splitAmount: number = 0;
  splitMethod: TenderMethod = 'Cash';
  isNavigating = false;
  showEmailModal = false;
  customerEmail = '';
  cashierNotes = '';
  cashierName = 'OPERATOR-01';
  terminalId = 'SECURE-POS-01';
  isProcessingSmart = false;
  smartStatusMessage = 'Processing...';
  showVoidConfirmation = false;
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly billApi = inject(BillApi);
  private readonly router = inject(Router);
  private readonly cart = inject(CartService);
  private readonly lastBill = inject(LastBillPersistence);
  public readonly toast = inject(ToastService);
  private readonly cdr = inject(ChangeDetectorRef);
  public readonly printService = inject(PrintService);
  private readonly destroy$ = new Subject<void>();
  public currentReceipt: ReceiptDto | null = null;

  get currentPayableAmount(): number { return this.bill?.finalAmount || 0; }
  get subtotal(): number { return (this.bill?.totalAmount || 0); }
  get taxAmount(): number { return this.currentPayableAmount - this.subtotal; }
  get cgst(): number { return this.taxAmount / 2; }
  get sgst(): number { return this.taxAmount / 2; }
  get amountPaidInSplit(): number { return this.partialPayments.reduce((sum, p) => sum + p.amount, 0); }
  get remainingToSettle(): number { return Math.max(0, this.currentPayableAmount - this.amountPaidInSplit); }
  get splitProgressPercent(): number { return (this.amountPaidInSplit / this.currentPayableAmount) * 100; }
  get isTenderValid(): boolean { 
    if (this.selectedMethod === 'Cash') return this.changeDue >= 0 && this.tenderedAmount > 0;
    if (this.selectedMethod === 'Split') return this.remainingToSettle === 0;
    return true; 
  }
  get ctaLabel(): string {
    if (this.state === 'processing_payment') return 'Authorizing...';
    if (this.selectedMethod === 'Cash') return 'Finalize Settlement';
    return 'Complete Payment';
  }

  ngOnInit(): void { this.initFlow(); }
  ngOnDestroy(): void { 
    console.log('[Payment] Component Destroying — cleaning up timers');
    this.destroy$.next(); 
    this.destroy$.complete(); 
    this.upiTimerSub?.unsubscribe(); 
  }

  private initFlow(): void {
    if (isPlatformBrowser(this.platformId)) {
      const id = this.route.snapshot.paramMap.get('id')!;
      
      console.log('[Payment] Current Route:', this.router.url);
      console.log('[Payment] Initializing with ID:', id);

      this.updateState('loading_payment', 'Synchronizing state...');
      this.billApi.getById(id).subscribe({
        next: (bill: any) => {
          this.bill = bill?.data || bill?.Data || bill;
          
          // 2. Intelligent State Restoration & Persistence Management
          const isFinalized = this.bill?.status === 'Finalized' || (this.bill?.status as any) === 3;
          
          console.log('[Payment] Transaction Status:', this.bill?.status);

          if (isFinalized) {
            this.updateState('completed');
            this.lastBill.clear();
          } else {
            this.updateState('awaiting_payment_input');
            this.lastBill.set(id);
          }
          
          this.tenderedAmount = this.bill!.finalAmount;
          this.calculateChange();
        },
        error: (err: unknown) => {
          console.error('[Payment] Restoration failed:', err);
          this.updateState('failed', 'Transaction not found');
          this.lastBill.clear();
        }
      });
    }
  }

  selectMethod(method: any): void { this.selectedMethod = method as TenderMethod; if (this.selectedMethod === 'Cash') { this.tenderedAmount = this.currentPayableAmount; this.calculateChange(); } this.cdr.detectChanges(); }
  onKeyPress(key: string): void { if (key === 'C') { this.tenderedAmount = 0; } else { const cur = this.tenderedAmount.toString(); if (key === '.' && cur.includes('.')) return; this.tenderedAmount = parseFloat(cur === '0' || cur === 'NaN' ? key : cur + key); } this.calculateChange(); }
  setExactCash(): void { this.tenderedAmount = this.currentPayableAmount; this.calculateChange(); }
  addDenomination(val: number): void { this.tenderedAmount = (this.tenderedAmount || 0) + val; this.calculateChange(); }
  calculateChange(): void { this.changeDue = (this.tenderedAmount || 0) - this.currentPayableAmount; this.cdr.detectChanges(); }

  handlePrimaryAction(): void { if (this.selectedMethod === 'Card') { this.simulateCardPayment(); } else if (this.selectedMethod === 'UPI') { this.handleUpiProgression(); } else { this.finalize(); } }

  simulateCardPayment(): void {
    this.terminalStatus = 'connecting'; this.terminalMessage = 'Linking...';
    timer(1000).subscribe(() => { this.terminalStatus = 'authorizing'; this.terminalMessage = 'Wait...';
      timer(1000).subscribe(() => { this.terminalStatus = 'approved'; this.terminalMessage = 'Approved'; timer(500).subscribe(() => this.finalize()); });
    });
  }

  handleUpiProgression(): void { this.upiStep = 'generating'; timer(500).subscribe(() => { this.upiStep = 'waiting'; this.startUpiTimer(); timer(2000).subscribe(() => { this.upiStep = 'success'; this.finalize(); }); }); }
  private startUpiTimer(): void { this.upiTimer = 180; this.upiTimerSub?.unsubscribe(); this.upiTimerSub = interval(1000).pipe(takeUntil(this.destroy$), take(181)).subscribe(v => { this.upiTimer = 180 - v; this.cdr.detectChanges(); }); }

  addToSplit(): void { if (this.splitAmount <= 0) return; this.partialPayments.push({ method: this.splitMethod, amount: this.splitAmount, timestamp: new Date() }); this.splitAmount = 0; this.cdr.detectChanges(); }
  removePartial(idx: number): void { this.partialPayments.splice(idx, 1); this.cdr.detectChanges(); }

  finalize(): void {
    if (!this.bill || this.state === 'processing_payment') return;
    
    // Prevent finalize if already completed
    if (this.bill.status === 'Finalized' || (this.bill.status as any) === 3) {
      this.updateState('completed');
      return;
    }

    this.updateState('processing_payment', 'Settling Transaction...');
    this.billApi.createPayment({ billId: this.bill.id, method: this.selectedMethod }).subscribe({
      next: () => { 
        this.updateState('completed'); 
        this.cart.clearCart(); 
        // 3. Clear active payment on success
        this.lastBill.clear(); 
        this.toast.success('Transaction Finalized'); 
      },
      error: (err: unknown) => { 
        this.updateState('awaiting_payment_input'); 
        this.toast.error((err as any)?.error?.message || 'Finalization failed'); 
      }
    });
  }

  cancelWithConfirm(): void { 
    console.log('[Payment] Manual Action: Voiding Transaction');
    this.billApi.cancel(this.bill!.id).subscribe({ next: () => { this.cart.clearCart(); this.router.navigate(['/pos']); } }); 
  }
  private updateState(s: PaymentState, m?: string): void { 
    console.log('[Payment] State Transition:', this.state, '→', s);
    this.state = s; 
    if (m) this.loadingMessage = m; 
    this.cdr.detectChanges(); 
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (this.state !== 'completed') return;
    // CRITICAL: Ignore global shortcuts if user is typing in a modal (e.g. email)
    if (this.showEmailModal) return;

    const key = (event.key || '').toUpperCase();
    if (key === 'ENTER' || key === 'P') {
      console.log('[Payment] Keyboard Trigger: Smart Billing');
      this.startSmartBilling();
    }
    if (key === 'N') {
      console.log('[Payment] Keyboard Trigger: Next Order');
      this.nextOrder();
    }
  }


  /** Called by the "PRINT & SEND RECEIPT" button on the completion screen */
  public async startSmartBilling(): Promise<void> {
    if (this.isProcessingSmart || !this.bill) return;
    // Always show modal first to capture optional email
    if (!this.showEmailModal) {
      console.log('[Payment] Opening Digital Receipt Modal');
      this.showEmailModal = true;
      return;
    }
    // If modal is already open, do nothing — user must click Continue or Skip
  }

  /** Called by "Skip & Print" button in modal — runs without email */
  public async skipAndPrint(): Promise<void> {
    this.customerEmail = '';
    await this.executeBillingPipeline();
  }

  /** Called by "Continue" button in modal — runs with email if provided */
  public async confirmBilling(): Promise<void> {
    await this.executeBillingPipeline();
  }

  /** Core billing pipeline: PDF → Print → Email (optional) → Navigate */
  private async executeBillingPipeline(): Promise<void> {
    if (this.isProcessingSmart || !this.bill) return;

    this.isProcessingSmart = true;
    this.cdr.detectChanges();

    try {
      // Step 1: Fetch Receipt — handle both wrapped {data: ...} and unwrapped responses
      this.smartStatusMessage = 'Syncing data...';
      this.cdr.detectChanges();
      let receipt = await this.billApi.getReceipt(this.bill.id).toPromise();
      // Defensive unwrap: some API interceptors may double-wrap the response
      if (!receipt) throw new Error('Receipt data not available. Please try again.');
      const r = receipt as any;
      if (r?.data && !r.billId) receipt = r.data;  // unwrap if still wrapped
      if (!receipt?.billId && !receipt?.billNumber) {
        console.error('[SmartBilling] Receipt appears empty:', receipt);
        throw new Error('Receipt returned empty data. Check backend camelCase config.');
      }

      console.log('[SmartBilling] Receipt loaded:', JSON.stringify(receipt));

      // Step 2: Generate & Download PDF
      this.smartStatusMessage = 'Saving PDF...';
      this.cdr.detectChanges();
      await this.printService.downloadA4Pdf(receipt);
      this.toast.success('Tax Invoice saved');

      // Step 3: Print Thermal
      this.smartStatusMessage = 'Printing receipt...';
      this.cdr.detectChanges();
      await this.printService.printThermal(receipt);
      this.toast.success('Thermal receipt dispatched');

      // Step 4: Email — properly awaited so errors surface to user
      if (this.customerEmail && this.customerEmail.includes('@')) {
        this.smartStatusMessage = 'Sending email...';
        this.cdr.detectChanges();
        try {
          await this.billApi.sendEmailReceipt(this.bill.id, this.customerEmail.trim()).toPromise();
          this.toast.success('Email sent to ' + this.customerEmail);
        } catch (emailErr: unknown) {
          // Email failure is non-fatal — receipt is already printed/saved
          const emailMsg = (emailErr as any)?.error?.message || (emailErr as any)?.message || 'Email failed';
          console.error('[SmartBilling] Email error:', emailErr);
          this.toast.error('Email failed: ' + emailMsg + ' (receipt still printed)');
        }
      }

      this.smartStatusMessage = '✓ All done!';
      this.toast.success('Invoice opened — use Print dialog to Save as PDF');
      this.cdr.detectChanges();

      // Close modal — user stays on success page until they click "Start New Order"
      console.log('[Payment] Billing Pipeline Complete — dismissing modal');
      this.showEmailModal = false;

    } catch (err: unknown) {
      const msg = (err as any)?.message || 'Billing pipeline failed. Please try again.';
      this.smartStatusMessage = 'Error — ' + msg;
      this.toast.error(msg);
      console.error('[SmartBilling] Error:', err);
      this.cdr.detectChanges();
      // Keep modal open so user can retry
    } finally {
      this.isProcessingSmart = false;
      this.cdr.detectChanges();
    }
  }

  public printReceipt(): void {
    if (this.printStatus === 'printing') return;
    console.log('[Payment] Manual Action: Printing Thermal Receipt');
    this.printStatus = 'printing';
    this.billApi.getReceipt(this.bill!.id).subscribe({
      next: (receipt) => { this.printStatus = 'success'; this.lastPrintTime = new Date(); this.printService.printThermal(receipt); },
      error: () => { this.printStatus = 'failed'; }
    });
  }

  public downloadInvoice(): void {
    if (this.pdfStatus === 'generating') return;
    console.log('[Payment] Manual Action: Downloading A4 PDF');
    this.pdfStatus = 'generating';
    this.billApi.getReceipt(this.bill!.id).subscribe({
      next: async (receipt) => { try { await this.printService.downloadA4Pdf(receipt); this.pdfStatus = 'success'; } catch { this.pdfStatus = 'failed'; } },
      error: () => { this.pdfStatus = 'failed'; }
    });
  }

  public openEmailModal(): void { 
    console.log('[Payment] Manual Action: Opening Email Modal');
    this.showEmailModal = true; 
  }
  public sendEmailReceipt(): void {
    if (this.emailStatus === 'sending') return;
    this.emailStatus = 'sending';
    this.billApi.sendEmailReceipt(this.bill!.id, this.customerEmail).subscribe({
      next: () => { this.emailStatus = 'success'; this.lastEmailRecipient = this.customerEmail; this.showEmailModal = false; this.toast.success('Sent'); },
      error: () => { this.emailStatus = 'failed'; }
    });
  }

  public nextOrder(): void { 
    if (this.isNavigating) return; 
    console.log('[Payment] Navigation: Starting Next Order');
    this.isNavigating = true; 
    // CRITICAL: Clear persistence so new order starts fresh
    this.lastBill.clear(); 
    this.router.navigate(['/pos']); 
  }
}
