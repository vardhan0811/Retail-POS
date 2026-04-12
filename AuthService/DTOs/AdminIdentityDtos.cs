using System.ComponentModel.DataAnnotations;

namespace AuthService.DTOs
{
    public class UpdateUserRoleAdminRequest
    {
        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateUserStatusAdminRequest
    {
        public bool IsActive { get; set; }
    }

    public class UserIdentityViewDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public Guid StoreId { get; set; }
    }
}
