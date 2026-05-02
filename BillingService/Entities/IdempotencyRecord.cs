using System;

namespace BillingService.Entities
{
    public class IdempotencyRecord
    {
        public string Id { get; set; } = string.Empty; // This will be the Idempotency-Key
        public string ResponseBody { get; set; } = string.Empty;
        public int StatusCode { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
