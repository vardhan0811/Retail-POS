using System;

namespace BillingService.Entities
{
    public class BillAuditLog
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid BillId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string OldState { get; set; } = string.Empty;
        public string NewState { get; set; } = string.Empty;
        public string UserId { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;

        public Bill Bill { get; set; }
    }
}
