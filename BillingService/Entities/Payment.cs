namespace BillingService.Entities
{
    public class Payment
    {
        public Guid Id { get; set; }
        public Guid BillId { get; set; }
        public Bill Bill { get; set; } = null!;
        public decimal Amount { get; set; }
        public string Method { get; set; } = string.Empty;
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
        public string? TransactionReference { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
