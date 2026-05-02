using System;

namespace BillingService.Entities
{
    public class RefundRecord
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public Bill Bill { get; set; } = null!;

        public Guid? BillItemId { get; set; }
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }     

        // Hybrid Financial Model
        public decimal SystemCalculatedAmount { get; set; } // Auto-calculated based on unit price + proportional tax
        public decimal? OverriddenAmount { get; set; }     // Manual override by Admin
        public bool IsOverridden { get; set; }              // Flag to indicate if the calculated amount was changed
        public string? OverrideReason { get; set; }        // Mandatory justification for override
        
        // Legacy support mapping (Optional: Can be phased out later)
        public decimal RefundAmount { get; set; } 
        public decimal TaxReversalAmount { get; set; }
        
        public string Reason { get; set; } = string.Empty;
        public RefundStatus Status { get; set; } = RefundStatus.REQUESTED;
        
        // Audit & Context
        public Guid StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
        public string? IdempotencyKey { get; set; }
        public string? StatusDescription { get; set; }

        public Guid RequestedBy { get; set; } 
        public Guid? ProcessedBy { get; set; } 
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ProcessedAt { get; set; }
    }
}
