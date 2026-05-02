using Shared.Contracts.Models;

namespace AuthService.DTOs
{
    public class AuthResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string? Role { get; set; }
        public UserStatus Status { get; set; }
        public IEnumerable<string> Permissions { get; set; } = new List<string>();
        public Guid? StoreId { get; set; }
        public string RefreshToken { get; set; } = string.Empty;
        public Guid? SessionId { get; set; }
    }
}
