using System.Collections.Generic;

namespace BillingService.DTOs
{
    public class RefundPolicy
    {
        public int RefundWindowHours { get; set; } = 24;
        public bool AllowPartialRefund { get; set; } = true;
        public List<string> RefundableProductTypes { get; set; } = new() { "GENERAL" };
        public List<string> NonRefundableTags { get; set; } = new() { "NON-REFUNDABLE" };
    }
}
