using System;
using System.Collections.Generic;
using Shared.Contracts.Events;

namespace Shared.Contracts.Events
{
    public class BillCancelledEvent
    {
        public Guid MessageId { get; set; } = Guid.NewGuid();
        public Guid BillId { get; set; }
        public Guid StoreId { get; set; }
        public decimal TotalAmount { get; set; }
        public decimal TaxAmount { get; set; }
        public decimal FinalAmount { get; set; }
        public List<BillItemEvent> Items { get; set; } = new();
    }
}
