namespace NotificationService.Entities
{
    public class Otp
    {
        public Guid Id { get; set; }
        public string Email { get; set; } = string.Empty;
        public string CodeHash { get; set; } = string.Empty;
        public DateTime ExpiryTime { get; set; }
        public bool IsUsed { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
