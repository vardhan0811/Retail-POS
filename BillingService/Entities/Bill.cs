namespace BillingService.Entities
{
    public class Bill
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;

        public Guid StoreId { get; set; }
        public Guid UserId { get; set; }

        public decimal TotalAmount { get; set; }   // before tax
        public decimal TaxAmount { get; set; }
        public decimal FinalAmount { get; set; }   // after tax

        public Guid? PaymentId { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [System.ComponentModel.DataAnnotations.Timestamp]
        public byte[] RowVersion { get; set; } = System.Array.Empty<byte>();

        public List<BillItem> Items { get; set; } = new();
        public BillStatus Status { get; set; } = BillStatus.Pending;
    }
}