using System;

namespace Shared.Contracts.Events
{
    public class StockFailedEvent
    {
        public Guid MessageId { get; set; }
        public Guid CorrelationId { get; set; }
        public Guid BillId { get; set; }
        public required string Reason { get; set; }
    }
}
