using System;
using System.Collections.Generic;
using BillingService.Entities;

namespace BillingService.DTOs
{
    public class RefundRequestDto
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;

        public RefundStatus Status { get; set; }
        public string Reason { get; set; } = string.Empty;
        public string? AdminNotes { get; set; }

        public Guid StoreId { get; set; }
        public string StoreName { get; set; } = string.Empty;

        public string RequestedByName { get; set; } = string.Empty;
        public string RequestedByEmail { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        
        public List<RefundItemDto> Items { get; set; } = new();

        public decimal TotalRefundAmount { get; set; }
    }

    public class RefundItemDto
    {
        public Guid Id { get; set; }
        public Guid BillItemId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }

        public decimal RefundAmount { get; set; }
        public decimal TaxReversalAmount { get; set; }
    }

    public class RefundProcessRequest
    {
        public Guid BillId { get; set; }
        public string? Reason { get; set; }
        public List<RefundItemRequest>? Items { get; set; }
    }

    public class RefundItemRequest
    {
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
    }
}
