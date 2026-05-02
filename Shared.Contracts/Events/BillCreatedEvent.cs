using System;
using System.Collections.Generic;

namespace Shared.Contracts.Events
{
    public class BillCreatedEvent
    {
        public Guid MessageId { get; set; }
        public Guid CorrelationId { get; set; }
        public Guid BillId { get; set; }
        public Guid StoreId { get; set; }
        public List<BillItemEvent> Items { get; set; } = new();
    }

    public class BillItemEvent
    {
        public Guid ProductId { get; set; }
        public string ProductName { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public decimal UnitPrice { get; set; }
        public decimal TaxPercentage { get; set; }
        public bool IsRefundable { get; set; }
    }
}
