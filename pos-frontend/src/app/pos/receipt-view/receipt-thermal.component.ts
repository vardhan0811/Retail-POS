import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptDto } from '../../core/bill.api';

@Component({
  selector: 'app-receipt-thermal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="thermal-receipt-container" *ngIf="receipt">
      <!-- HEADER: BRAND IDENTITY -->
      <header class="thermal-header">
        <div class="brand-logo">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
            <!-- Minimal Bull Silhouette -->
            <path d="M8 8C8 8 7 9 6 9M16 8C16 8 17 9 18 9M9 11L12 14L15 11M10 16H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </div>
        <h1 class="store-name">{{ receipt.storeName | uppercase }}</h1>
        <p class="tagline">PREMIUM RETAIL EXPERIENCE</p>
        <div class="store-details">
          {{ receipt.storeAddress }}<br/>
          GSTIN: 27AAACR1234A1Z1
        </div>
      </header>

      <!-- META: TRANSACTION DATA -->
      <div class="receipt-meta">
        <div class="meta-row">
          <span class="label">INVOICE</span>
          <span class="value">#{{ receipt.billNumber }}</span>
        </div>
        <div class="meta-row">
          <span class="label">DATE</span>
          <span class="value">{{ receipt.date | date:'dd MMM yyyy | HH:mm' }}</span>
        </div>
        <div class="meta-row">
          <span class="label">TERMINAL</span>
          <span class="value">TERM-01 / OP-{{ receipt.cashierId }}</span>
        </div>
      </div>

      <div class="divider-dashed"></div>

      <!-- ITEMS: HIGH-DENSITY GRID -->
      <main class="thermal-body">
        <div class="item-header">
          <span>DESCRIPTION</span>
          <span>TOTAL</span>
        </div>
        
        <div *ngFor="let item of receipt.items" class="item-row">
          <div class="item-name">{{ item.name | uppercase }}</div>
          <div class="item-calc">
            <span class="qty-price">{{ item.quantity }} × {{ item.unitPrice | number:'1.2-2' }}</span>
            <span class="item-total">{{ item.totalPrice | number:'1.2-2' }}</span>
          </div>
        </div>
      </main>

      <div class="divider-dashed"></div>

      <!-- SUMMARY: PRECISE HIERARCHY -->
      <section class="thermal-summary">
        <div class="summary-row">
          <span>SUBTOTAL</span>
          <span>{{ receipt.subTotal | number:'1.2-2' }}</span>
        </div>
        <div class="summary-row tax">
          <span>CGST (2.5%)</span>
          <span>{{ (receipt.tax / 2) | number:'1.2-2' }}</span>
        </div>
        <div class="summary-row tax">
          <span>SGST (2.5%)</span>
          <span>{{ (receipt.tax / 2) | number:'1.2-2' }}</span>
        </div>
        <div class="summary-row discount" *ngIf="receipt.discount > 0">
          <span>DISCOUNT</span>
          <span>-{{ receipt.discount | number:'1.2-2' }}</span>
        </div>
        
        <div class="grand-total-box">
          <span class="label">NET PAYABLE</span>
          <span class="value">₹{{ receipt.total | number:'1.2-2' }}</span>
        </div>
      </section>

      <!-- SETTLEMENT -->
      <section class="thermal-settlement">
        <div class="settlement-badge">
          <span class="method">{{ receipt.paymentMethod | uppercase }} SETTLED ✓</span>
        </div>
        <div class="txn-ref" *ngIf="receipt.transactionReference">
          REF: {{ receipt.transactionReference }}
        </div>
      </section>

      <!-- FOOTER: BRAND CLOSING -->
      <footer class="thermal-footer">
        <div class="qr-zone">
          <div class="qr-mock"></div>
          <p>Scan to Verify</p>
        </div>
        <p class="thank-you">THANK YOU FOR YOUR PATRONAGE</p>
        <p class="policy">Items once sold are not returnable</p>
        <div class="audit-ref">
          {{ receipt.billId.slice(0,13).toUpperCase() }}
        </div>
        <div class="customer-tag">CUSTOMER COPY</div>
      </footer>
    </div>
  `,
  styles: [`
    .thermal-receipt-container {
      width: 80mm;
      padding: 6mm 8mm;
      background: white;
      color: #0f172a;
      font-family: 'Inconsolata', monospace;
      margin: 0 auto;
      line-height: 1.1;
      font-size: 10pt;
    }

    .brand-logo {
      width: 12mm;
      height: 12mm;
      margin: 0 auto 3mm;
      color: #0f172a;
    }

    .thermal-header { text-align: center; margin-bottom: 5mm; }
    .store-name { font-size: 14pt; font-weight: 900; margin: 0; letter-spacing: -0.5px; }
    .tagline { font-size: 7pt; font-weight: 700; color: #10b981; margin: 1mm 0 2mm; letter-spacing: 1px; }
    .store-details { font-size: 8pt; color: #64748b; line-height: 1.3; }

    .receipt-meta { margin-bottom: 4mm; }
    .meta-row { display: flex; justify-content: space-between; margin-bottom: 1mm; }
    .meta-row .label { font-size: 7pt; font-weight: 900; color: #94a3b8; }
    .meta-row .value { font-weight: 700; }

    .divider-dashed { border-top: 1px dashed #cbd5e1; margin: 3mm 0; }

    .item-header { display: flex; justify-content: space-between; font-size: 8pt; font-weight: 900; color: #94a3b8; margin-bottom: 2mm; }
    .item-row { margin-bottom: 3mm; }
    .item-name { font-weight: 700; margin-bottom: 1mm; font-size: 10pt; }
    .item-calc { display: flex; justify-content: space-between; font-size: 9pt; }
    .qty-price { color: #64748b; }
    .item-total { font-weight: 700; }

    .thermal-summary { margin-top: 2mm; }
    .summary-row { display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 1.5mm; }
    .summary-row.tax { font-size: 8pt; color: #64748b; font-weight: 400; font-style: italic; }
    .summary-row.discount { color: #ef4444; }

    .grand-total-box {
      margin-top: 4mm;
      padding: 3mm 0;
      border-top: 1.5px solid #0f172a;
      border-bottom: 1.5px solid #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .grand-total-box .label { font-size: 11pt; font-weight: 900; }
    .grand-total-box .value { font-size: 16pt; font-weight: 900; }

    .thermal-settlement { margin: 5mm 0; text-align: center; }
    .settlement-badge { 
      background: #0f172a; 
      color: white; 
      padding: 1.5mm 3mm; 
      display: inline-block; 
      border-radius: 1mm;
      font-size: 8pt;
      font-weight: 900;
    }
    .txn-ref { font-size: 7pt; color: #94a3b8; margin-top: 1.5mm; }

    .thermal-footer { text-align: center; margin-top: 6mm; color: #64748b; }
    .qr-zone { margin-bottom: 4mm; }
    .qr-mock { width: 25mm; height: 25mm; border: 1px solid #0f172a; margin: 0 auto 1.5mm; position: relative; }
    .qr-mock::after { content: 'QR'; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 8pt; font-weight: 900; }
    .qr-zone p { font-size: 7pt; font-weight: 900; margin: 0; }

    .thank-you { font-size: 10pt; font-weight: 900; color: #0f172a; margin: 0; }
    .policy { font-size: 7pt; margin: 1mm 0 4mm; }
    .audit-ref { font-size: 7pt; font-weight: 700; margin-bottom: 3mm; letter-spacing: 1px; }
    .customer-tag { border: 1px solid #0f172a; display: inline-block; padding: 1mm 4mm; font-size: 8pt; font-weight: 900; color: #0f172a; }
  `]
})
export class ReceiptThermalComponent {
  @Input() receipt: ReceiptDto | null = null;
}
