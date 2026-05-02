import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReceiptDto } from '../../core/bill.api';

@Component({
  selector: 'app-invoice-a4',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="a4-invoice-container" *ngIf="receipt">
      <!-- PAID STAMP -->
      <div class="paid-stamp">PAID</div>

      <!-- HEADER: PREMIUM BRAND GRID -->
      <header class="invoice-header">
        <div class="brand-block">
          <div class="logo-wrap">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="currentColor"/>
              <path d="M8 8C8 8 7 9 6 9M16 8C16 8 17 9 18 9M9 11L12 14L15 11M10 16H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="brand-text">
            <h1 class="store-name">{{ receipt.storeName }}</h1>
            <p class="store-type">OFFICIAL TAX INVOICE</p>
            <address class="store-address">
              {{ receipt.storeAddress }}<br/>
              <strong>GSTIN:</strong> 27AAACR1234A1Z1 | <strong>CIN:</strong> U72900MH2023PTC123456
            </address>
          </div>
        </div>

        <div class="meta-block">
          <h2 class="doc-title">INVOICE</h2>
          <div class="meta-grid">
            <div class="meta-item">
              <label>INVOICE NO</label>
              <span>#{{ receipt.billNumber }}</span>
            </div>
            <div class="meta-item">
              <label>DATE OF ISSUE</label>
              <span>{{ receipt.date | date:'dd MMMM yyyy' }}</span>
            </div>
            <div class="meta-item">
              <label>TERMINAL ID</label>
              <span>TERM-A01</span>
            </div>
          </div>
        </div>
      </header>

      <!-- INFO GRID: BILLING & LOGISTICS -->
      <div class="info-grid">
        <div class="info-item">
          <label>BILL TO</label>
          <div class="val">
            <p class="name">Walk-in Customer</p>
            <p class="sub">Cash Sale Transaction</p>
          </div>
        </div>
        <div class="info-item">
          <label>CASHIER DETAILS</label>
          <div class="val">
            <p class="name">OPERATOR-{{ receipt.cashierId }}</p>
            <p class="sub">Shift: General Morning</p>
          </div>
        </div>
        <div class="info-item text-right">
          <label>PAYMENT METHOD</label>
          <div class="val">
            <p class="name accent">{{ receipt.paymentMethod | uppercase }}</p>
            <p class="sub">Status: Settled ✓</p>
          </div>
        </div>
      </div>

      <!-- MAIN ITEM TABLE -->
      <div class="table-container">
        <table class="invoice-table">
          <thead>
            <tr>
              <th class="w-12">SR.</th>
              <th class="flex-1">ITEM DESCRIPTION</th>
              <th class="w-24">HSN</th>
              <th class="w-16 text-center">QTY</th>
              <th class="w-32 text-right">RATE</th>
              <th class="w-32 text-right">TAX %</th>
              <th class="w-32 text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of receipt.items; let i = index">
              <td>{{ i + 1 }}</td>
              <td class="font-bold">{{ item.name }}</td>
              <td class="text-muted">8471.30</td>
              <td class="text-center">{{ item.quantity }}</td>
              <td class="text-right">₹{{ item.unitPrice | number:'1.2-2' }}</td>
              <td class="text-right text-muted">18%</td>
              <td class="text-right font-bold">₹{{ item.totalPrice | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- SUMMARY SECTION -->
      <div class="summary-wrapper">
        <div class="left-col">
          <div class="tax-box">
            <label>TAX BREAKDOWN</label>
            <table class="tax-table">
              <tr>
                <td>Central GST (CGST)</td>
                <td>9.0%</td>
                <td class="text-right">₹{{ (receipt.tax / 2) | number:'1.2-2' }}</td>
              </tr>
              <tr>
                <td>State GST (SGST)</td>
                <td>9.0%</td>
                <td class="text-right">₹{{ (receipt.tax / 2) | number:'1.2-2' }}</td>
              </tr>
              <tr class="total-tax">
                <td colspan="2">TOTAL INTEGRATED TAX</td>
                <td class="text-right">₹{{ receipt.tax | number:'1.2-2' }}</td>
              </tr>
            </table>
          </div>
          <div class="amount-words">
            <label>AMOUNT IN WORDS</label>
            <p>Rupees {{ receipt.total | number:'1.0-0' }} Only</p>
          </div>
        </div>

        <div class="right-col">
          <div class="totals-grid">
            <div class="total-row">
              <label>Sub-Total (Pre-Tax)</label>
              <span>₹{{ receipt.subTotal | number:'1.2-2' }}</span>
            </div>
            <div class="total-row highlight">
              <label>Total Tax Value</label>
              <span>₹{{ receipt.tax | number:'1.2-2' }}</span>
            </div>
            <div class="total-row" *ngIf="receipt.discount > 0">
              <label>Discount Applied</label>
              <span class="red">-₹{{ receipt.discount | number:'1.2-2' }}</span>
            </div>
            <div class="grand-total-box">
              <div class="lbl">
                <span class="main">TOTAL PAYABLE</span>
                <span class="sub">Including all applicable taxes</span>
              </div>
              <div class="val">₹{{ receipt.total | number:'1.2-2' }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER: TRUST & COMPLIANCE -->
      <footer class="invoice-footer">
        <div class="trust-grid">
          <div class="qr-block">
            <div class="qr-placeholder">QR</div>
            <div class="qr-text">
              <p class="title">Digital Verification</p>
              <p class="desc">Scan to verify this invoice authenticity on our secure portal.</p>
              <p class="audit">REF: {{ receipt.billId.toUpperCase() }}</p>
            </div>
          </div>
          <div class="terms-block">
            <label>TERMS & CONDITIONS</label>
            <p>1. Subject to Mumbai Jurisdiction. 2. Goods once sold are not returnable. 3. This is a computer generated invoice and requires no physical signature.</p>
          </div>
        </div>

        <div class="sign-block">
          <div class="sign-line"></div>
          <p class="sign-name">Authorized Signatory</p>
          <p class="sign-store">For {{ receipt.storeName }}</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .a4-invoice-container {
      width: 210mm;
      min-height: 297mm;
      padding: 15mm 20mm;
      background: white;
      color: #0f172a;
      font-family: 'Inter', system-ui, sans-serif;
      position: relative;
      box-sizing: border-box;
    }

    .paid-stamp {
      position: absolute;
      top: 60mm;
      right: 30mm;
      border: 6px solid #10b981;
      color: #10b981;
      padding: 4mm 12mm;
      font-size: 42pt;
      font-weight: 900;
      text-transform: uppercase;
      transform: rotate(-15deg);
      opacity: 0.1;
      pointer-events: none;
      border-radius: 4mm;
      z-index: 10;
    }

    /* HEADER */
    .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 10mm;
      margin-bottom: 10mm;
      border-bottom: 4px solid #0f172a;
    }

    .brand-block { display: flex; gap: 6mm; }
    .logo-wrap { width: 16mm; height: 16mm; color: #0f172a; }
    .store-name { font-size: 28pt; font-weight: 900; margin: 0; line-height: 0.8; letter-spacing: -1.5px; }
    .store-type { font-size: 9pt; font-weight: 800; color: #10b981; letter-spacing: 2px; margin: 2mm 0 4mm; }
    .store-address { font-size: 9pt; font-style: normal; color: #64748b; line-height: 1.5; }

    .meta-block { text-align: right; }
    .doc-title { font-size: 32pt; font-weight: 900; color: #f1f5f9; margin: 0 0 6mm; line-height: 0.7; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4mm 8mm; text-align: left; }
    .meta-item label { display: block; font-size: 7pt; font-weight: 900; color: #94a3b8; margin-bottom: 1mm; }
    .meta-item span { font-size: 11pt; font-weight: 900; color: #0f172a; }

    /* INFO GRID */
    .info-grid { 
      display: grid; 
      grid-template-columns: 1.2fr 1fr 0.8fr; 
      gap: 10mm; 
      margin-bottom: 12mm; 
      padding: 6mm 8mm; 
      background: #f8fafc; 
      border-radius: 4mm; 
      border: 1px solid #f1f5f9; 
    }
    .info-item label { font-size: 7pt; font-weight: 900; color: #94a3b8; display: block; margin-bottom: 2mm; letter-spacing: 1px; }
    .info-item .name { font-size: 12pt; font-weight: 900; margin: 0; color: #0f172a; }
    .info-item .sub { font-size: 8pt; color: #64748b; margin-top: 1mm; }
    .info-item .name.accent { color: #10b981; }

    /* TABLE */
    .table-container { margin-bottom: 12mm; }
    .invoice-table { width: 100%; border-collapse: separate; border-spacing: 0; }
    .invoice-table th { background: #0f172a; color: white; padding: 4mm 2mm; font-size: 8.5pt; font-weight: 900; text-align: left; }
    .invoice-table th:first-child { border-top-left-radius: 3mm; }
    .invoice-table th:last-child { border-top-right-radius: 3mm; }
    .invoice-table td { padding: 5mm 2mm; border-bottom: 1px solid #f1f5f9; font-size: 10pt; }
    .font-bold { font-weight: 900; }
    .text-muted { color: #94a3b8; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }

    /* SUMMARY */
    .summary-wrapper { display: grid; grid-template-columns: 1.4fr 1fr; gap: 15mm; }
    .tax-box label, .amount-words label { font-size: 7.5pt; font-weight: 900; color: #94a3b8; display: block; margin-bottom: 3mm; letter-spacing: 1px; }
    .tax-table { width: 100%; font-size: 9pt; }
    .tax-table td { padding: 2mm 0; font-weight: 600; }
    .total-tax { border-top: 2px solid #0f172a; }
    .total-tax td { font-weight: 900; padding-top: 4mm; }
    
    .amount-words { margin-top: 8mm; padding: 4mm; background: #f8fafc; border-radius: 3mm; }
    .amount-words p { font-size: 9pt; font-weight: 900; color: #0f172a; margin: 0; }

    .totals-grid { display: flex; flex-direction: column; gap: 4mm; }
    .total-row { display: flex; justify-content: space-between; font-size: 10pt; font-weight: 700; color: #64748b; }
    .total-row span { color: #0f172a; font-weight: 900; }
    .total-row.highlight { color: #10b981; }
    .total-row .red { color: #ef4444; }

    .grand-total-box {
      margin-top: 4mm;
      padding-top: 6mm;
      border-top: 4px solid #0f172a;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .grand-total-box .main { font-size: 11pt; font-weight: 900; display: block; color: #0f172a; }
    .grand-total-box .sub { font-size: 7.5pt; color: #94a3b8; font-weight: 700; text-transform: uppercase; }
    .grand-total-box .val { font-size: 36pt; font-weight: 900; letter-spacing: -2px; line-height: 0.8; color: #0f172a; }

    /* FOOTER */
    .invoice-footer { margin-top: 20mm; padding-top: 10mm; border-top: 2px solid #f1f5f9; display: flex; justify-content: space-between; align-items: flex-start; }
    .trust-grid { display: flex; flex-direction: column; gap: 8mm; }
    .qr-block { display: flex; gap: 5mm; align-items: center; }
    .qr-placeholder { width: 22mm; height: 22mm; background: #0f172a; color: white; border-radius: 3mm; display: flex; align-items: center; justify-content: center; font-weight: 900; }
    .qr-text .title { font-size: 10pt; font-weight: 900; margin: 0; }
    .qr-text .desc { font-size: 8pt; color: #64748b; max-width: 60mm; line-height: 1.4; margin: 1mm 0; }
    .qr-text .audit { font-size: 7pt; font-weight: 900; color: #94a3b8; font-family: monospace; }
    
    .terms-block label { font-size: 7.5pt; font-weight: 900; color: #94a3b8; display: block; margin-bottom: 2mm; }
    .terms-block p { font-size: 7.5pt; color: #94a3b8; max-width: 100mm; line-height: 1.5; font-weight: 600; }

    .sign-block { text-align: center; }
    .sign-line { width: 60mm; border-bottom: 2px solid #0f172a; margin-bottom: 4mm; }
    .sign-name { font-size: 10pt; font-weight: 900; margin: 0; }
    .sign-store { font-size: 8pt; color: #64748b; margin-top: 1mm; }

    @media print {
      .a4-invoice-container { padding: 0mm !important; }
      .summary-wrapper, .invoice-footer { page-break-inside: avoid; }
    }
  `]
})
export class InvoiceA4Component {
  @Input() receipt: ReceiptDto | null = null;
}
