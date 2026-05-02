namespace BillingService.DTOs
{
    public class BillingSalesSummaryDto
    {
        public decimal TotalRevenue { get; set; }
        public int TotalOrders { get; set; }
        public decimal TotalTax { get; set; }
        public int CancelledOrders { get; set; }
        public decimal RefundAmount { get; set; }
    }

    public class BillingRefundSummaryDto
    {
        public decimal TotalRefundAmount { get; set; }
    }

    public class SalesTrendPointDto
    {
        public string Label { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public int Orders { get; set; }
        public decimal Refunds { get; set; }
    }

    public class RefundAnalyticsDto
    {
        public decimal TotalRefundAmount { get; set; }
        public double RefundRate { get; set; }
        public List<RefundedProductDto> TopRefundedProducts { get; set; } = new();
        public List<RefundReasonDto> Reasons { get; set; } = new();
    }

    public class RefundedProductDto
    {
        public string ProductName { get; set; } = string.Empty;
        public int RefundCount { get; set; }
        public decimal RefundAmount { get; set; }
    }

    public class RefundReasonDto
    {
        public string Reason { get; set; } = string.Empty;
        public int Count { get; set; }
    }

    public class PaymentMethodDto
    {
        public string Method { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int Count { get; set; }
    }

    public class ProductMetricDto
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int TotalQuantity { get; set; }
        public int RefundCount { get; set; }
        public decimal TotalRevenue { get; set; }
    }
}
