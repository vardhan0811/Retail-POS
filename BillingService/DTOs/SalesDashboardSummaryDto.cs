using System;
using System.Collections.Generic;

namespace BillingService.DTOs
{
    public class SalesDashboardSummaryDto
    {
        public decimal TodayRevenue { get; set; }
        public decimal YesterdayRevenue { get; set; }
        public decimal RevenueChangePercentage { get; set; }
        public int TodayTransactions { get; set; }
        public decimal TodayAvgBillValue { get; set; }
        public decimal TodayRefundAmount { get; set; }
        public int TodayCancelledOrders { get; set; }
        public int PendingRefundsCount { get; set; }
        public List<DailySalesDto> LastSevenDays { get; set; } = new();
    }

    public class DailySalesDto
    {
        public DateTime Date { get; set; }
        public decimal Revenue { get; set; }
    }
}
