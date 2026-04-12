using System.ComponentModel.DataAnnotations;

namespace NotificationService.DTOs
{
    public class SendOtpRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;
    }

    public class VerifyOtpRequest
    {
        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [RegularExpression("^[0-9]{6}$", ErrorMessage = "Otp must be a 6-digit code")]
        public string Otp { get; set; } = string.Empty;
    }
}
