using System;
using System.Collections.Generic;

namespace BillingService.DTOs
{
    public class ReceiptDto
    {
        public Guid BillId { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public string StoreName { get; set; } = "Retail POS Store"; // Ideally fetch from StoreClient
        public DateTime Date { get; set; }
        public string CashierId { get; set; } = string.Empty;
        
        public List<ReceiptItemDto> Items { get; set; } = new();
        
        public decimal SubTotal { get; set; }
        public decimal Tax { get; set; }
        public decimal Total { get; set; }
        
        public string PaymentMethod { get; set; } = string.Empty;
        public string PaymentId { get; set; } = string.Empty;
        public string TransactionReference { get; set; } = string.Empty;
        public DateTime PaidAt { get; set; }
        
        public string StoreAddress { get; set; } = string.Empty;
        public string Footer { get; set; } = "Thank you for shopping with us!";
    }

    public class ReceiptItemDto
    {
        public string Name { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TotalPrice { get; set; }
    }
}
