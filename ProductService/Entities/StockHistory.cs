using System;

namespace ProductService.Entities
{
    public class StockHistory
    {
        public Guid Id { get; set; }
        public Guid ProductId { get; set; }
        public Guid StoreId { get; set; }

        public int Change { get; set; }           // e.g., +10, -5
        public string Action { get; set; } = string.Empty; // e.g., "INCREMENT", "DECREMENT", "ADJUST"
        
        public Guid PerformedBy { get; set; }     // UserId
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public string? Note { get; set; }
    }
}
