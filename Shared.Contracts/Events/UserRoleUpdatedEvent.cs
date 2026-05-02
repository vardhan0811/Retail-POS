namespace Shared.Contracts.Events
{
    public class UserRoleUpdatedEvent
    {
        public Guid MessageId { get; set; }
        public Guid CorrelationId { get; set; }
        public Guid UserId { get; set; }
        public string Role { get; set; } = string.Empty;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
