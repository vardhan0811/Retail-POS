using System.ComponentModel.DataAnnotations;
using Shared.Contracts.Models;

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
        public UserStatus Status { get; set; }
    }

    public class UpdateUserStoreAdminRequest
    {
        public Guid? StoreId { get; set; }
    }
    
    public class RejectUserAdminRequest
    {
        [Required]
        [MaxLength(200)]
        public string Reason { get; set; } = string.Empty;
    }

    public class UserIdentityViewDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Role { get; set; }
        public UserStatus Status { get; set; }
        public Guid? StoreId { get; set; }
    }
}
