using System;
using Shared.Contracts.Models;

namespace AuthService.Entities
{
    public class User
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? PasswordHash { get; set; }

        public Guid? RoleId { get; set; }
        public Role? Role { get; set; }

        public Guid? StoreId { get; set; }

        public string AuthProvider { get; set; } = "Local";
        public string? ProviderUserId { get; set; }

        public UserStatus Status { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public string? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? LockedReason { get; set; }
    }
}
