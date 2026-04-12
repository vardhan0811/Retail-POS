using BillingService.Entities;

namespace BillingService.DTOs
{
    public class BillDto
    {
        public Guid Id { get; set; }
        public string BillNumber { get; set; } = string.Empty;
        public Guid StoreId { get; set; }
        public Guid UserId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public Guid? PaymentId { get; set; }
        public DateTime CreatedAt { get; set; }
        public BillStatus Status { get; set; }
        public List<BillItemDto> Items { get; set; } = new();
    }
}
