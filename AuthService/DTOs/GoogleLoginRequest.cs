using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class GoogleLoginRequest
    {
        [Required]
        public string IdToken { get; set; } = string.Empty;
    }
}
