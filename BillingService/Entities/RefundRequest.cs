using System;
using System.Collections.Generic;

namespace BillingService.Entities
{
    public class RefundRequest
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public Bill Bill { get; set; } = null!;

        public RefundStatus Status { get; set; } = RefundStatus.REQUESTED;
        public string Reason { get; set; } = string.Empty;
        public decimal TotalRefundAmount { get; set; }
        public string? AdminNotes { get; set; }

        // Audit & Context
        public Guid StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;
        
        public Guid RequestedBy { get; set; }
        public string RequestedByName { get; set; } = string.Empty;
        public string RequestedByEmail { get; set; } = string.Empty;
        public Guid? ApprovedBy { get; set; }
        public Guid? SettledBy { get; set; }
        public Guid? RejectedBy { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? ApprovedAt { get; set; }
        public DateTime? SettledAt { get; set; }
        public DateTime? RejectedAt { get; set; }

        public List<RefundItem> Items { get; set; } = new();
    }
}
