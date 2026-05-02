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
        public SummaryBox Users { get; set; } = new();
        public SummaryBox Stores { get; set; } = new();
        public DashboardSummaryDto BillingSummary { get; set; } = new();
        public DashboardAlertsDto Alerts { get; set; } = new();
        public List<DashboardActivityDto> RecentActivity { get; set; } = new();
        public InventoryInsightDto InventoryInsights { get; set; } = new();
    }

    public class SummaryBox
    {
        public int Total { get; set; }
        public int Active { get; set; }
        public int Inactive { get; set; }
        public DateTime? LastUpdate { get; set; }
    }

    public class DashboardSummaryDto
    {
        public decimal TodayRevenue { get; set; }
        public decimal YesterdayRevenue { get; set; }
        public decimal RevenueChangePercentage { get; set; }
        public int TodayTransactions { get; set; }
        public decimal TodayAvgBillValue { get; set; }
        public decimal TodayRefundAmount { get; set; }
        public int TodayCancelledOrders { get; set; }
        public int ActiveStaffCount { get; set; }
        public decimal TotalGrossRevenue { get; set; }
        public List<DailySalesTrendDto> SalesTrend { get; set; } = new();
    }

    public class DailySalesTrendDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
    }

    public class DashboardAlertsDto
    {
        public int PendingRefunds { get; set; }
        public int LowStockItems { get; set; }
        public int OutOfStockItems { get; set; }
        public int FailedTransactions { get; set; }
    }

    public class DashboardActivityDto
    {
        public string Type { get; set; } = string.Empty; 
        public string Message { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    public class InventoryInsightDto
    {
        public List<ProductViewDto> TopSelling { get; set; } = new();
        public List<ProductViewDto> LowStockItems { get; set; } = new();
    }

    public class RefundRecordDto
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal RefundAmount { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
}
