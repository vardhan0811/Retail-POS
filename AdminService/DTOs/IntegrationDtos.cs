namespace AdminService.DTOs
{
    public class BillViewDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public Guid StoreId { get; set; }
        public Guid UserId { get; set; }
        public decimal FinalAmount { get; set; }
        public DateTime CreatedAt { get; set; }
    // BillingService serializes BillStatus enum as number by default.
        public string Status { get; set; } = string.Empty;
    }

    public class TopProductViewDto
    {
        public Guid ProductId { get; set; }
        public int TotalQty { get; set; }
    }

    public class ProductViewDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string SKU { get; set; } = string.Empty;
        public decimal SellingPrice { get; set; }
        public int Stock { get; set; }
        public Guid StoreId { get; set; }
        public bool IsActive { get; set; }
    }

    public class DashboardResponseDto
    {
        public object Users { get; set; } = new();
        public object Stores { get; set; } = new();
        public object Billing { get; set; } = new();
        public object? Product { get; set; }
    }
}
