using BillingService.Entities;

namespace BillingService.DTOs
{
    public class BillDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public Guid StoreId { get; set; }
        public Guid UserId { get; set; }
        
        // Flattened for compatibility
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public decimal DiscountAmount { get; set; }

        // Structured for UI
        public BillPricingDto Pricing { get; set; } = new();
        
        public Guid? PaymentId { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public BillStatus Status { get; set; }
        public RefundStatus? RefundStatus { get; set; }
        public DateTime? RefundApprovedAt { get; set; }
        
        public DateTime? SuspendedAt { get; set; }
        public Guid? SuspendedBy { get; set; }
        public int TtlMinutes { get; set; } = 15;
        public DateTime? ExpiresAt => SuspendedAt?.AddMinutes(TtlMinutes);
        public bool IsExpired => Status == BillStatus.Expired || (Status == BillStatus.Suspended && DateTime.UtcNow > ExpiresAt);
        
        public List<BillItemDto> Items { get; set; } = new();
        public List<BillAuditLogDto> AuditTrail { get; set; } = new();

        // Email Tracking
        public bool IsEmailed { get; set; }
        public string? EmailRecipient { get; set; }
        public DateTime? EmailedAt { get; set; }
        public int EmailResendCount { get; set; }
    }

    public class BillPricingDto
    {
        public decimal Subtotal { get; set; }
        public decimal Tax { get; set; }
        public decimal Discount { get; set; }
        public decimal Total { get; set; }
    }

    public class BillAuditLogDto
    {
        public string Action { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty; // Mapping NewState
        public DateTime Timestamp { get; set; }
        public string Actor { get; set; } = string.Empty; // Mapping UserId
    }
}
