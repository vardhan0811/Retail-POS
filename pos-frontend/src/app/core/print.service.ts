import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT, DecimalPipe } from '@angular/common';
import { ReceiptDto } from './bill.api';

// ─────────────────────────────────────────────────────────────────────────────
// BRAND LOGO — Direct Pixabay CDN URL.
// WHY NOT BASE64 / html2pdf?
//   html2pdf uses html2canvas which CANNOT capture cross-origin images → blank PDF.
//   The iframe approach lets the BROWSER render the image natively → always visible.
//   The user saves the print dialog as PDF (File > Save as PDF).
// ─────────────────────────────────────────────────────────────────────────────
const BULL_LOGO_URL = 'https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png';

@Injectable({ providedIn: 'root' })
export class PrintService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly document   = inject(DOCUMENT);
  private readonly isBrowser  = isPlatformBrowser(this.platformId);
  private readonly fmt        = new DecimalPipe('en-IN');

  // ─── Public API ─────────────────────────────────────────────────────────────

  /** Opens the browser print dialog for an 80mm thermal receipt */
  public async printThermal(receipt: ReceiptDto): Promise<void> {
    if (!this.isBrowser) return;
    const html = this.buildThermalHtml(receipt);
    this.printViaIframe(html, '80mm auto');
  }

  /**
   * Opens the browser print dialog for an A4 invoice.
   * User clicks "Save as PDF" in the dialog.
   * This replaces html2pdf which produced blank pages due to CORS image restrictions.
   */
  public async downloadA4Pdf(receipt: ReceiptDto): Promise<void> {
    if (!this.isBrowser) return;
    const html = this.buildA4Html(receipt);
    this.printViaIframe(html, 'A4 portrait');
  }

  /** Alias — same as downloadA4Pdf, kept for API compatibility */
  public async printA4(receipt: ReceiptDto): Promise<void> {
    return this.downloadA4Pdf(receipt);
  }

  // ─── Core Print Engine ──────────────────────────────────────────────────────

  /**
   * Injects HTML into a hidden iframe as a full document and triggers
   * the browser print dialog after all images have loaded.
   * Works with external image URLs — no CORS/canvas restrictions.
   */
  private printViaIframe(bodyContent: string, pageSize: string): void {
    const iframe = this.document.createElement('iframe');
    // Hidden but still in the DOM so the browser renders it
    iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
    this.document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) { this.document.body.removeChild(iframe); return; }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    @page { size: ${pageSize}; margin: 0; }
    body  { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    img   { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  </style>
</head>
<body>
${bodyContent}
<script>
  // Wait for all images to finish loading before printing.
  // This prevents the browser from printing before the logo appears.
  (function() {
    function doPrint() {
      setTimeout(function() {
        window.print();
        setTimeout(function() {
          try { window.frameElement && window.frameElement.remove(); } catch(e) {}
        }, 500);
      }, 300);
    }
    var imgs = document.querySelectorAll('img');
    if (!imgs.length) { doPrint(); return; }
    var done = 0, total = imgs.length;
    function tick() { if (++done >= total) doPrint(); }
    for (var i = 0; i < imgs.length; i++) {
      if (imgs[i].complete) { tick(); }
      else { imgs[i].onload = tick; imgs[i].onerror = tick; }
    }
  })();
</script>
</body>
</html>`);
    doc.close();
  }

  // ─── 80mm Thermal Receipt ───────────────────────────────────────────────────

  private buildThermalHtml(d: ReceiptDto): string {
    // Null-safe all values up front
    const billNo    = (d?.billNumber || d?.billId?.toString()?.slice(-8) || 'UNKNOWN').toUpperCase();
    const dateStr   = d?.date ? new Date(d.date).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');
    const cashier   = (d?.cashierId   || 'CASHIER').substring(0, 12).toUpperCase();
    const payMethod = (d?.paymentMethod || 'CASH').toUpperCase();
    const status    = (d?.status        || 'PAID').toUpperCase();

    const safeItems = Array.isArray(d?.items) && d.items.length > 0 ? d.items : [];
    const itemsHtml = safeItems.map(item => `
      <tr>
        <td style="padding:5px 0;max-width:110px;overflow:hidden;text-overflow:ellipsis;">${(item?.name || 'Item').toUpperCase()}</td>
        <td style="padding:5px 0;text-align:center;width:30px;">${item?.quantity ?? 1}</td>
        <td style="padding:5px 0;text-align:right;width:80px;">&#8377;${this.fmt.transform(item?.totalPrice ?? 0, '1.2-2')}</td>
      </tr>`).join('');

    const discountRow = (d?.discount ?? 0) > 0
      ? `<tr><td colspan="2" style="padding:4px 0;">DISCOUNT</td><td style="text-align:right;padding:4px 0;">-&#8377;${this.fmt.transform(d.discount, '1.2-2')}</td></tr>`
      : '';

    return `
<div style="width:80mm;margin:0 auto;padding:8mm 6mm;font-family:'Courier New', Courier, monospace;font-size:13px;color:#000;line-height:1.6;background:#fff;">

  <!-- LOGO -->
  <div style="text-align:center;margin-bottom:12px;">
    <img src="${BULL_LOGO_URL}"
         alt="Retail POS"
         onerror="this.style.display='none'"
         style="display:block;margin:0 auto;width:60px;height:auto;object-fit:contain;" />
  </div>

  <!-- BRAND -->
  <div style="text-align:center;margin-bottom:15px;">
    <div style="font-size:20px;font-weight:900;letter-spacing:3px;color:#000;">RETAIL POS</div>
    <div style="font-size:10px;color:#333;letter-spacing:2px;font-weight:bold;margin-top:2px;">OFFICIAL RETAIL RECEIPT</div>
  </div>

  <!-- BILL META -->
  <table style="width:100%;border-collapse:collapse;font-size:11px;margin-bottom:8px;font-weight:bold;">
    <tr><td style="padding:2px 0;">BILL NO:</td><td style="text-align:right;">${billNo}</td></tr>
    <tr><td style="padding:2px 0;">DATE:</td><td style="text-align:right;">${dateStr}</td></tr>
    <tr><td style="padding:2px 0;">CASHIER:</td><td style="text-align:right;">${cashier}</td></tr>
  </table>

  <div style="border-top:1.5px dashed #000;margin:6px 0;"></div>

  <!-- ITEMS -->
  <table style="width:100%;border-collapse:collapse;font-size:11px;">
    <thead>
      <tr style="font-weight:900;text-transform:uppercase;">
        <th style="text-align:left;padding:5px 0;">ITEM</th>
        <th style="text-align:center;width:30px;">QTY</th>
        <th style="text-align:right;width:80px;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      <tr><td colspan="3"><div style="border-top:1px dashed #000;margin:4px 0;"></div></td></tr>
      ${itemsHtml}
    </tbody>
  </table>

  <div style="border-top:1.5px dashed #000;margin:8px 0 6px;"></div>

  <!-- TOTALS -->
  <table style="width:100%;border-collapse:collapse;font-size:12px;">
    <tr><td style="padding:3px 0;">SUBTOTAL:</td><td style="text-align:right;padding:3px 0;">&#8377;${this.fmt.transform(d?.subTotal ?? 0, '1.2-2')}</td></tr>
    <tr><td style="padding:3px 0;">TAX (GST):</td><td style="text-align:right;padding:3px 0;">&#8377;${this.fmt.transform(d?.tax ?? 0, '1.2-2')}</td></tr>
    ${discountRow}
    <tr style="font-size:18px;font-weight:900;border-top:2px solid #000;">
      <td style="padding-top:8px;">TOTAL:</td>
      <td style="text-align:right;padding-top:8px;">&#8377;${this.fmt.transform(d?.total ?? 0, '1.2-2')}</td>
    </tr>
  </table>

  <div style="border-top:1.5px dashed #000;margin:10px 0;"></div>

  <!-- PAYMENT + FOOTER -->
  <div style="font-size:10px;margin-bottom:12px;font-weight:bold;">
    <div style="margin-bottom:3px;">PAYMENT: ${payMethod}</div>
    <div>STATUS: ${status}</div>
  </div>
  
  <div style="text-align:center;border-top:1px solid #000;padding-top:12px;font-size:10px;">
    <div style="font-weight:900;margin-bottom:4px;text-transform:uppercase;">Thank you for shopping!</div>
    <div style="color:#555;font-size:9px;">Retail POS Hub &bull; v3.0</div>
  </div>

</div>`;
  }

  // ─── A4 Invoice ─────────────────────────────────────────────────────────────

  private buildA4Html(d: ReceiptDto): string {
    const billNo    = (d?.billNumber || d?.billId?.toString() || 'UNKNOWN').toUpperCase();
    const dateStr   = d?.date
      ? new Date(d.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
      : new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' });
    const storeName = (d?.storeName   || 'Retail POS Store').toUpperCase();
    const storeAddr = d?.storeAddress || '123 Business District, City Center';
    const payMethod = (d?.paymentMethod || 'CASH').toUpperCase();
    const txRef     = d?.transactionReference || 'N/A';
    const status    = (d?.status || 'SETTLED').toUpperCase();

    const safeItems = Array.isArray(d?.items) && d.items.length > 0 ? d.items : [];
    const itemRows  = safeItems.map((item, i) => `
      <tr style="background:${i % 2 === 0 ? '#fafafa' : '#fff'};">
        <td style="padding:10px 8px;font-weight:600;">${(item?.name || 'Item').toUpperCase()}</td>
        <td style="padding:10px 8px;text-align:center;">${item?.quantity ?? 1}</td>
        <td style="padding:10px 8px;text-align:right;">&#8377;${this.fmt.transform(item?.unitPrice ?? 0, '1.2-2')}</td>
        <td style="padding:10px 8px;text-align:right;font-weight:700;">&#8377;${this.fmt.transform(item?.totalPrice ?? 0, '1.2-2')}</td>
      </tr>`).join('');

    return `
<div style="width:210mm;min-height:297mm;padding:20mm;font-family:Arial,sans-serif;background:#fff;color:#111;box-sizing:border-box;">

  <!-- HEADER -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f172a;padding-bottom:20px;margin-bottom:28px;">

    <div style="display:flex;align-items:center;gap:16px;">
      <img src="${BULL_LOGO_URL}"
           alt="Retail POS"
           onerror="this.style.display='none'"
           style="display:block;width:60px;height:60px;object-fit:contain;" />
      <div>
        <div style="font-size:26px;font-weight:900;color:#0f172a;line-height:1;">RETAIL POS</div>
        <div style="font-size:10px;font-weight:700;color:#64748b;letter-spacing:2px;margin-top:4px;">OFFICIAL TAX INVOICE</div>
      </div>
    </div>

    <div style="text-align:right;">
      <div style="font-size:11px;color:#94a3b8;font-weight:700;letter-spacing:1px;margin-bottom:4px;">INVOICE</div>
      <div style="font-size:22px;font-weight:900;color:#0f172a;">#${billNo}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px;">${dateStr}</div>
    </div>

  </div>

  <!-- STORE + PAYMENT META -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;">
    <tr>
      <td style="vertical-align:top;width:50%;">
        <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Billed From</div>
        <div style="font-size:14px;font-weight:800;color:#0f172a;">${storeName}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">${storeAddr}</div>
        <div style="font-size:12px;color:#64748b;">GSTIN: 27AABCU1234F1Z5</div>
      </td>
      <td style="vertical-align:top;text-align:right;">
        <div style="font-size:9px;font-weight:900;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:6px;">Payment Details</div>
        <div style="font-size:14px;font-weight:800;color:#0f172a;">${payMethod}</div>
        <div style="font-size:12px;color:#64748b;margin-top:4px;">Ref: ${txRef}</div>
        <div style="font-size:12px;color:#10b981;font-weight:700;">${status}</div>
      </td>
    </tr>
  </table>

  <!-- ITEMS TABLE -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:13px;">
    <thead>
      <tr style="border-bottom:2px solid #0f172a;border-top:1px solid #e2e8f0;">
        <th style="padding:10px 8px;text-align:left;font-size:11px;font-weight:900;color:#0f172a;letter-spacing:1px;">DESCRIPTION</th>
        <th style="padding:10px 8px;text-align:center;font-size:11px;font-weight:900;color:#0f172a;letter-spacing:1px;">QTY</th>
        <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:900;color:#0f172a;letter-spacing:1px;">RATE</th>
        <th style="padding:10px 8px;text-align:right;font-size:11px;font-weight:900;color:#0f172a;letter-spacing:1px;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div style="display:flex;justify-content:flex-end;margin-bottom:50px;">
    <div style="width:280px;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:7px 0;color:#64748b;">Subtotal</td>
          <td style="padding:7px 0;text-align:right;font-weight:700;">&#8377;${this.fmt.transform(d?.subTotal ?? 0, '1.2-2')}</td>
        </tr>
        <tr style="border-bottom:1px solid #f1f5f9;">
          <td style="padding:7px 0;color:#64748b;">Tax (GST)</td>
          <td style="padding:7px 0;text-align:right;font-weight:700;">&#8377;${this.fmt.transform(d?.tax ?? 0, '1.2-2')}</td>
        </tr>
        <tr style="border-top:2px solid #0f172a;">
          <td style="padding:12px 0;font-size:15px;font-weight:900;color:#0f172a;">GRAND TOTAL</td>
          <td style="padding:12px 0;text-align:right;font-size:20px;font-weight:900;color:#10b981;">&#8377;${this.fmt.transform(d?.total ?? 0, '1.2-2')}</td>
        </tr>
      </table>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;display:flex;justify-content:space-between;align-items:flex-end;">
    <div style="max-width:370px;">
      <div style="font-size:9px;font-weight:900;color:#1e293b;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Terms &amp; Conditions</div>
      <div style="font-size:10px;color:#94a3b8;line-height:1.5;">
        Goods once sold are refundable only within 24 hours with a valid receipt.
        This is a computer-generated invoice and does not require a physical signature.
      </div>
    </div>
    <div style="text-align:center;">
      <div style="width:130px;border-bottom:1px solid #cbd5e1;margin-bottom:6px;"></div>
      <div style="font-size:10px;font-weight:700;color:#1e293b;">Authorized Signatory</div>
    </div>
  </div>

</div>`;
  }
}
