using BillingService.Entities;

namespace BillingService.DTOs
{
    public class PaymentDto
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public PaymentStatus Status { get; set; }
        public string? TransactionReference { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
