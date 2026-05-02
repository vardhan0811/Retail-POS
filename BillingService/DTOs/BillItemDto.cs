namespace BillingService.DTOs
{
    public class BillItemDto
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal MRP { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxPercentage { get; set; }
        public decimal TotalPrice { get; set; }
        public bool IsRefundable { get; set; }
        public int RefundWindowHours { get; set; }
        public int RefundedQuantity { get; set; }
        public bool IsRefunded { get; set; }
        public bool IsRefundEligible { get; set; }
        public DateTime? RefundDeadline { get; set; }
    }
}

