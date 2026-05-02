namespace AdminService.DTOs
{
    // ─── Shared Filter ───────────────────────────────────────────────────────────
    public class ReportFilter
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate   { get; set; }
        public Guid?     StoreId   { get; set; }
        public string?   Status    { get; set; }
        public string    Timezone  { get; set; } = "UTC";
        public string?   Granularity { get; set; }  // hour | day | week (auto if null)
    }

    // ─── KPI Summary ─────────────────────────────────────────────────────────────
    public class KpiSummaryDto
    {
        public decimal GrossRevenue    { get; set; }
        public decimal RefundAmount    { get; set; }
        public decimal NetRevenue      { get; set; }
        public int     TotalOrders     { get; set; }
        public decimal AvgTicket       { get; set; }
        public decimal TotalTax        { get; set; }
        public int     CancelledOrders { get; set; }
        public double  RefundRate      { get; set; }
    }

    // ─── Sales Trend ─────────────────────────────────────────────────────────────
    public class SalesTrendPointDto
    {
        public string  Label   { get; set; } = string.Empty;
        public decimal Revenue { get; set; }
        public int     Orders  { get; set; }
        public decimal Refunds { get; set; }
    }

    // ─── Refund Analytics ────────────────────────────────────────────────────────
    public class RefundAnalyticsDto
    {
        public decimal             TotalRefundAmount     { get; set; }
        public double              RefundRate            { get; set; }
        public List<RefundedProductDto> TopRefundedProducts { get; set; } = new();
        public List<RefundReasonDto>    Reasons             { get; set; } = new();
    }

    public class RefundedProductDto
    {
        public string  ProductName  { get; set; } = string.Empty;
        public int     RefundCount  { get; set; }
        public decimal RefundAmount { get; set; }
    }

    public class RefundReasonDto
    {
        public string Reason { get; set; } = string.Empty;
        public int    Count  { get; set; }
    }

    // ─── Payment Breakdown ───────────────────────────────────────────────────────
    public class PaymentMethodDto
    {
        public string  Method { get; set; } = string.Empty;
        public decimal Amount { get; set; }
        public int     Count  { get; set; }
    }

    // ─── Top Products (extended) ─────────────────────────────────────────────────
    public class ProductMetricDto
    {
        public Guid    ProductId        { get; set; }
        public string  ProductName      { get; set; } = string.Empty;
        public int     TotalQuantity    { get; set; }
        public int     RefundCount      { get; set; }
        public int     NetQuantitySold  { get; set; }
        public decimal TotalRevenue     { get; set; }
    }

    // ─── Legacy (kept for precomputed consumer) ──────────────────────────────────
    public class ReportDataDto
    {
        public decimal TotalSales  { get; set; }
        public int     TotalOrders { get; set; }
        public decimal AvgTicket   { get; set; }
        public decimal TaxCollected { get; set; }
        public List<ProductMetricDto> TopProducts { get; set; } = new();
    }
}
