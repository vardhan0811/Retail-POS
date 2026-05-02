using System;

namespace AuthService.Entities
{
    public class UserSession
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
        
        public Guid? TerminalId { get; set; }
        public Terminal? Terminal { get; set; }

        public DateTime LoginTime { get; set; } = DateTime.UtcNow;
        public DateTime? LastActivity { get; set; }
        public DateTime? LogoutTime { get; set; }
        
        public string Role { get; set; } = string.Empty;
        public Guid StoreId { get; set; }
        public bool IsActive { get; set; } = true;
    }
}
