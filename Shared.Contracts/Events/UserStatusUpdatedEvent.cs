using System;
using Shared.Contracts.Models;

namespace Shared.Contracts.Events
{
    public class UserStatusUpdatedEvent
    {
        public Guid MessageId { get; set; }
        public Guid CorrelationId { get; set; }
        public Guid UserId { get; set; }
        public UserStatus Status { get; set; }
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
