using System.ComponentModel.DataAnnotations;

namespace AdminService.DTOs
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public Guid StoreId { get; set; }
    }

    public class UpdateUserRoleRequest
    {
        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateUserStatusRequest
    {
        public bool IsActive { get; set; }
    }
}
