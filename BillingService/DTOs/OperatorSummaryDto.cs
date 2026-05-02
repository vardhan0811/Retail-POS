using System.Collections.Generic;

namespace BillingService.DTOs
{
    public class OperatorSummaryDto
    {
        public int TotalBillsToday { get; set; }
        public decimal TotalRevenueToday { get; set; }
        public List<BillDto> RecentTransactions { get; set; } = new();
    }
}
