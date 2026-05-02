using System;

namespace BillingService.Entities
{
    public class RefundItem
    {
        public Guid Id { get; set; }
        public Guid RefundRequestId { get; set; }
        public RefundRequest RefundRequest { get; set; } = null!;

        public Guid BillItemId { get; set; }
        public BillItem BillItem { get; set; } = null!;

        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }

        public decimal UnitPriceAtTimeOfSale { get; set; }
        public decimal TaxPercentageAtTimeOfSale { get; set; }
        
        public decimal SystemCalculatedAmount { get; set; } // Quantity * UnitPrice + proportional Tax
        public decimal RefundAmount { get; set; }           // Final amount to be paid back (can be overridden)
        public decimal TaxReversalAmount { get; set; }      // Portion of tax being reversed
    }
}
