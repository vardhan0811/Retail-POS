using Shared.Contracts.Models;
using System.ComponentModel.DataAnnotations;

namespace AdminService.DTOs
{
    public class UserDto
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Role { get; set; }
        public UserStatus Status { get; set; }
        public Guid? StoreId { get; set; }
        public string? StoreName { get; set; }
        public List<Guid> AssignedStoreIds { get; set; } = new List<Guid>();
        public List<string> AssignedStoreNames { get; set; } = new List<string>();
    }

    public class UpdateUserRoleRequest
    {
        [Required]
        [MaxLength(50)]
        public string Role { get; set; } = string.Empty;
    }

    public class UpdateUserStatusRequest
    {
        public UserStatus Status { get; set; }
    }

    public class UpdateUserStoreRequest
    {
        [Required]
        public List<Guid> StoreIds { get; set; } = new List<Guid>();
    }

    public class RejectUserAdminRequest
    {
        [Required]
        [MaxLength(200)]
        public string Reason { get; set; } = string.Empty;
    }
}
