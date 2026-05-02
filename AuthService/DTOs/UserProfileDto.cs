using System;
using System.Collections.Generic;

namespace AuthService.DTOs
{
    public class UserProfileDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Role { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid? StoreId { get; set; }
        public List<string> Permissions { get; set; } = new();

        // Session Information
        public Guid? ActiveSessionId { get; set; }
        public string? ActiveTerminalName { get; set; }
        public DateTime? LastLogin { get; set; }
    }

    public class SessionInfoDto
    {
        public Guid SessionId { get; set; }
        public Guid? TerminalId { get; set; }
        public string TerminalName { get; set; } = string.Empty;
        public DateTime LoginTime { get; set; }
        public DateTime? LastActivity { get; set; }
        public bool IsActive { get; set; }
    }

    public class AuthAuditLogDto
    {
        public Guid Id { get; set; }
        public string Action { get; set; } = string.Empty;
        public DateTime Timestamp { get; set; }
        public string? IpAddress { get; set; }
        public string? Details { get; set; }
        public string? TerminalName { get; set; }
    }
}
