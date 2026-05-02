using System;
using Shared.Contracts.Models;

namespace Shared.Contracts.Events
{
    public class UserCreatedEvent
    {
        public Guid MessageId { get; set; }
        public Guid CorrelationId { get; set; }
        public Guid UserId { get; set; }
        public required string Email { get; set; }
        public required string UserName { get; set; }
        public string? Role { get; set; }
        public Guid? StoreId { get; set; }
        public UserStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
    }
}
