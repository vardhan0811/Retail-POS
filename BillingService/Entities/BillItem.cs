namespace BillingService.Entities
{
    public class BillItem
    {
        public Guid Id { get; set; }

        public Guid BillId { get; set; }
        public Bill Bill { get; set; } = null!;

        public Guid ProductId { get; set; }

        public string ProductName { get; set; } = string.Empty;

        public int Quantity { get; set; }

        public decimal MRP { get; set; }

        public decimal UnitPrice { get; set; }

        public decimal TaxPercentage { get; set; }

        public decimal TotalPrice { get; set; }
        public bool IsRefundable { get; set; } = true;
        public int RefundWindowHours { get; set; } = 24;
        public int RefundedQuantity { get; set; } = 0;
        public bool IsRefunded { get; set; } = false;

    }
}