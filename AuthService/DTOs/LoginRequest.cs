using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class LoginRequest
    {
        [Required]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MaxLength(128)]
        public string Password { get; set; } = string.Empty;

        public Guid? TerminalId { get; set; }
    }
}
