using System.Text;
using BillingService.DTOs;
using PuppeteerSharp;
using PuppeteerSharp.Media;

namespace BillingService.Services
{
    public class PdfService : IPdfService
    {
        public async Task<byte[]> GenerateInvoicePdfAsync(ReceiptDto receipt)
        {
            // 1. Ensure browser is available
            var browserFetcher = new BrowserFetcher();
            await browserFetcher.DownloadAsync();

            // 2. Launch browser
            using var browser = await Puppeteer.LaunchAsync(new LaunchOptions 
            { 
                Headless = true,
                Args = new[] { "--no-sandbox", "--disable-setuid-sandbox" }
            });

            using var page = await browser.NewPageAsync();
            
            // 3. Generate the EXACT same HTML as used in the email
            var itemsHtml = string.Join("", receipt.Items.Select(item => $@"
                <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 12px 8px;'>{item.Name.ToUpper()}</td>
                    <td style='padding: 12px 8px; text-align: center;'>{item.Quantity}</td>
                    <td style='padding: 12px 8px; text-align: right;'>&#8377; {item.UnitPrice:F2}</td>
                    <td style='padding: 12px 8px; text-align: right; font-weight: 700;'>&#8377; {item.TotalPrice:F2}</td>
                </tr>"));

            var htmlBody = $@"
<div style='background-color: #ffffff; padding: 40px; font-family: Arial, sans-serif; width: 210mm; min-height: 297mm; margin: auto; box-sizing: border-box;'>
    <div style='border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;'>
        <!-- Branded Header -->
        <div style='padding: 40px; border-bottom: 2px solid #0f172a;'>
            <table style='width: 100%; border-collapse: collapse;'>
                <tr>
                    <td style='vertical-align: middle;'>
                        <img src='https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png' style='width: 60px; height: 60px; margin-bottom: 10px;' />
                        <div style='font-size: 26px; font-weight: 900; color: #0f172a;'>RETAIL POS</div>
                        <div style='font-size: 10px; color: #64748b; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;'>Official Tax Invoice</div>
                    </td>
                    <td style='text-align: right; vertical-align: top;'>
                        <div style='font-size: 10px; color: #94a3b8; font-weight: 700; margin-bottom: 5px;'>INVOICE</div>
                        <div style='font-size: 22px; font-weight: 900; color: #0f172a;'>#{receipt.BillNumber}</div>
                        <div style='font-size: 12px; color: #64748b;'>{receipt.Date:dd MMM yyyy}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div style='padding: 40px;'>
            <table style='width: 100%; border-collapse: collapse; margin-bottom: 40px;'>
                <tr>
                    <td style='width: 50%; vertical-align: top;'>
                        <div style='font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;'>Store Details</div>
                        <div style='font-size: 14px; font-weight: 700; color: #0f172a;'>{receipt.StoreName}</div>
                        <div style='font-size: 12px; color: #64748b; margin-top: 4px;'>{receipt.StoreAddress}</div>
                    </td>
                    <td style='text-align: right; vertical-align: top;'>
                        <div style='font-size: 10px; color: #94a3b8; font-weight: 900; text-transform: uppercase; margin-bottom: 8px;'>Payment Details</div>
                        <div style='font-size: 14px; font-weight: 700; color: #0f172a;'>{receipt.PaymentMethod}</div>
                        <div style='font-size: 12px; color: #10b981; font-weight: 700; margin-top: 4px;'>SETTLED</div>
                    </td>
                </tr>
            </table>
            
            <!-- Items Table -->
            <table style='width: 100%; border-collapse: collapse; margin-bottom: 40px; font-size: 13px;'>
                <thead>
                    <tr style='border-bottom: 2px solid #0f172a;'>
                        <th style='padding: 12px 8px; text-align: left;'>DESCRIPTION</th>
                        <th style='padding: 12px 8px; text-align: center;'>QTY</th>
                        <th style='padding: 12px 8px; text-align: right;'>RATE</th>
                        <th style='padding: 12px 8px; text-align: right;'>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {itemsHtml}
                </tbody>
            </table>

            <!-- Totals -->
            <div style='display: flex; justify-content: flex-end;'>
                <table style='width: 280px; margin-left: auto; border-collapse: collapse;'>
                    <tr>
                        <td style='padding: 8px 0; color: #64748b; font-size: 13px;'>Subtotal</td>
                        <td style='padding: 8px 0; text-align: right; font-weight: 700;'>&#8377; {receipt.SubTotal:F2}</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px 0; color: #64748b; font-size: 13px;'>Tax (GST)</td>
                        <td style='padding: 8px 0; text-align: right; font-weight: 700;'>&#8377; {receipt.Tax:F2}</td>
                    </tr>
                    <tr style='border-top: 2px solid #0f172a;'>
                        <td style='padding: 15px 0; font-weight: 900; font-size: 16px;'>TOTAL DUE</td>
                        <td style='padding: 15px 0; text-align: right; font-weight: 900; font-size: 24px; color: #10b981;'>&#8377; {receipt.Total:F2}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div style='background: #f8fafc; padding: 40px; border-top: 1px solid #e2e8f0;'>
            <table style='width: 100%;'>
                <tr>
                    <td style='width: 60%;'>
                        <div style='font-size: 10px; font-weight: 900; color: #1e293b; text-transform: uppercase; margin-bottom: 8px;'>Terms & Conditions</div>
                        <div style='font-size: 10px; color: #94a3b8; line-height: 1.6;'>
                            Goods once sold are refundable only within 24 hours.<br/>
                            This is a computer-generated invoice and does not require a signature.
                        </div>
                    </td>
                    <td style='text-align: center; vertical-align: bottom;'>
                        <div style='width: 150px; border-bottom: 1px solid #cbd5e1; margin: 0 auto 8px auto;'></div>
                        <div style='font-size: 10px; font-weight: 700; color: #1e293b;'>Authorized Signatory</div>
                    </td>
                </tr>
            </table>
        </div>
    </div>
</div>";

            await page.SetContentAsync(htmlBody);
            
            // 4. Generate PDF bytes
            var pdfOptions = new PdfOptions
            {
                Format = PaperFormat.A4,
                PrintBackground = true,
                MarginOptions = new MarginOptions { Top = "0px", Bottom = "0px", Left = "0px", Right = "0px" }
            };

            var pdfData = await page.PdfDataAsync(pdfOptions);
            await browser.CloseAsync();

            return pdfData;
        }
    }
}
