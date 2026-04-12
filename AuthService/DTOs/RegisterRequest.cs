using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class RegisterRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        [MaxLength(256)]
        public string Email { get; set; } = string.Empty;

        [Required]
        [MinLength(8)]
        [MaxLength(128)]
        public string Password { get; set; } = string.Empty;

        //public Guid RoleId { get; set; } // If you want to assign a admin role during registration

        [Required]
        [NotEmptyGuid(ErrorMessage = "StoreId is required")]
        public Guid StoreId { get; set; }
    }
}
