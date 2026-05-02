namespace Shared.Contracts.Events
{
    public class BillCompletedEvent
    {
        public Guid MessageId { get; set; } = Guid.NewGuid();
        public Guid BillId { get; set; }
        public Guid StoreId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public System.Collections.Generic.List<BillItemEvent> Items { get; set; } = new();
    }
}

