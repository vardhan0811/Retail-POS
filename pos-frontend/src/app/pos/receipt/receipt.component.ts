import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div id="receipt" class="receipt-body mx-auto bg-white text-black p-4 font-mono leading-tight">
      <div class="text-center mb-6">
        <h1 class="text-lg font-black uppercase tracking-tight mb-0.5">{{ data.storeName }}</h1>
        <p class="text-[10px] leading-tight opacity-80">{{ data.storeAddress }}</p>
        <div *ngIf="data.isRefund" class="mt-3 py-1 bg-black text-white text-[11px] font-black uppercase tracking-[0.1em]">Refund Voucher</div>
      </div>
      
      <div class="border-b border-dashed border-gray-800 mb-3"></div>
      
      <div class="flex justify-between text-[11px] mb-1">
        <span class="font-bold">{{ data.isRefund ? 'Orig Bill:' : 'Bill #:' }}</span>
        <span>{{ data.billNumber }}</span>
      </div>
      <div class="flex justify-between text-[11px] mb-3">
        <span class="font-bold">Date:</span>
        <span>{{ data.date | date:'short' }}</span>
      </div>
      
      <div class="border-b border-dashed border-gray-800 mb-1"></div>
      
      <table class="w-full text-left mb-3">
        <thead>
          <tr class="border-b border-gray-800">
            <th class="py-1 text-[10px] font-black uppercase">Item</th>
            <th class="py-1 text-center text-[10px] font-black uppercase">Qty</th>
            <th class="py-1 text-right text-[10px] font-black uppercase">Price</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100">
          <tr *ngFor="let item of data.items">
            <td class="py-2">
               <div class="text-[11px] font-bold leading-none">{{ item.name }}</div>
               <div *ngIf="item.isRefunded" class="text-[8px] font-black text-gray-500 italic">REFUNDED</div>
            </td>
            <td class="py-2 text-center text-[11px]">{{ item.quantity }}</td>
            <td class="py-2 text-right text-[11px] font-black">₹{{ item.totalPrice | number:'1.2-2' }}</td>
          </tr>
        </tbody>
      </table>
      
      <div class="border-b border-dashed border-gray-800 mb-3"></div>
      
      <div class="space-y-1 mb-4">
         <div class="flex justify-between text-[11px]">
            <span class="uppercase">Subtotal</span>
            <span class="font-bold">₹{{ data.subTotal || data.total | number:'1.2-2' }}</span>
         </div>
         <div class="flex justify-between text-[11px]">
            <span class="uppercase">Tax</span>
            <span class="font-bold">₹{{ data.tax | number:'1.2-2' }}</span>
         </div>
         <div class="flex justify-between text-[14px] font-black border-t border-gray-800 pt-2 mt-2">
            <span class="uppercase">{{ data.isRefund ? 'TOTAL REFUND' : 'TOTAL' }}</span>
            <span>₹{{ data.total | number:'1.2-2' }}</span>
         </div>
      </div>
      
      <div class="bg-gray-50 p-3 border border-gray-200 mb-5 text-[10px]">
        <div class="flex justify-between mb-1">
          <span class="opacity-60 uppercase">Method:</span>
          <span class="font-bold">{{ data.paymentMethod }}</span>
        </div>
        <div class="flex justify-between" *ngIf="data.paymentId">
          <span class="opacity-60 uppercase">Ref:</span>
          <span class="font-mono">{{ data.paymentId }}</span>
        </div>
      </div>
      
      <div class="text-center pt-4 border-t border-dashed border-gray-800">
        <p class="font-black uppercase text-[11px] tracking-[0.1em] mb-1">{{ data.isRefund ? 'REFUND SETTLED' : (data.footer || 'THANK YOU') }}</p>
        <p class="text-[8px] opacity-40">Retail POS v1.0.4</p>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      background: white;
    }

    .receipt-body {
      width: 80mm;
      min-height: 100mm;
      font-size: 11px;
      box-sizing: border-box;
      border: 1px solid #f1f5f9;
    }
    
    .receipt-body * {
      color: black !important;
    }

    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        visibility: hidden;
        -webkit-print-color-adjust: exact;
      }
      #receipt, #receipt * {
        visibility: visible;
      }
      #receipt {
        position: absolute;
        left: 0;
        top: 0;
        width: 80mm;
        border: none;
        padding: 4mm;
      }
    }
  `]
})
export class ReceiptComponent {
  @Input() data: any = {
      storeName: 'RETAIL POS STORE',
      storeAddress: '123 Main Street',
      billNumber: 'BILL000',
      date: new Date(),
      items: [],
      subTotal: 0,
      tax: 0,
      total: 0,
      paymentMethod: 'CASH',
      paymentId: '',
      footer: 'THANK YOU!'
  };
}
