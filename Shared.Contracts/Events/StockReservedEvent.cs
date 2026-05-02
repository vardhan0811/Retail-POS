using System;

namespace Shared.Contracts.Events
{
    public class StockReservedEvent
    {
        public Guid MessageId { get; set; }
        public Guid CorrelationId { get; set; }
        public Guid BillId { get; set; }
    }
}
