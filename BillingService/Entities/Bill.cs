namespace BillingService.Entities
{
    public class Bill
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;

        public Guid StoreId { get; set; }
        public Guid UserId { get; set; }
        public Guid SessionId { get; set; }
        public string Role { get; set; } = string.Empty;

        public decimal TotalAmount { get; set; }   // before tax
        public decimal TaxAmount { get; set; }
        public decimal DiscountAmount { get; set; }
        public decimal FinalAmount { get; set; }   // after tax

        public Guid? PaymentId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? CompletedAt { get; set; }
        
        public DateTime? SuspendedAt { get; set; }
        public Guid? SuspendedBy { get; set; }

        [System.ComponentModel.DataAnnotations.Timestamp]
        public byte[] RowVersion { get; set; } = System.Array.Empty<byte>();

        public List<BillItem> Items { get; set; } = new();
        public List<Payment> Payments { get; set; } = new();
        public List<BillAuditLog> AuditLogs { get; set; } = new();
        public List<RefundRequest> RefundRequests { get; set; } = new();
        public BillStatus Status { get; set; } = BillStatus.Draft;
        public RefundStatus? RefundStatus { get; set; }
        public DateTime? RefundApprovedAt { get; set; }

        // Email Tracking
        public bool IsEmailed { get; set; }
        public string? EmailRecipient { get; set; }
        public DateTime? EmailedAt { get; set; }
        public int EmailResendCount { get; set; }
    }
}