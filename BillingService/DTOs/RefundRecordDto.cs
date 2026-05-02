using System;
using BillingService.Entities;

namespace BillingService.DTOs
{
    public class RefundRecordDto
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        
        public Guid? BillItemId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        
        public int Quantity { get; set; }
        public decimal SystemCalculatedAmount { get; set; }
        public decimal RefundAmount { get; set; }
        public decimal TaxReversalAmount { get; set; }
        
        public bool IsOverridden { get; set; }
        public decimal? OverriddenAmount { get; set; }
        public string? OverrideReason { get; set; }
        
        public string Reason { get; set; } = string.Empty;
        public RefundStatus Status { get; set; }
        public string? StatusDescription { get; set; }
        
        public Guid RequestedBy { get; set; }
        public Guid? ProcessedBy { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? ProcessedAt { get; set; }

        public Guid StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
    }
}
