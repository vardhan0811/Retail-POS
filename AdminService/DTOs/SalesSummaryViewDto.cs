namespace AdminService.DTOs
{
    public class SalesSummaryViewDto
    {
        public decimal TotalRevenue { get; set; }
        public decimal TotalTaxes { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
    }
}
