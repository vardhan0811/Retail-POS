using System;

namespace AuthService.Entities
{
    public class AuthAuditLog
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string Action { get; set; } = string.Empty; // Login, Logout, ChangePassword, Lock, Unlock
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string? IpAddress { get; set; }
        public Guid? TerminalId { get; set; }
        public string? Details { get; set; }
    }
}
