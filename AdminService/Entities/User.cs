using Shared.Contracts.Models;
using System;
using System.Collections.Generic;

namespace AdminService.Entities
{
    public class User
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string? Role { get; set; }
        public UserStatus Status { get; set; }
        public Guid? StoreId { get; set; } // Kept for backward compatibility/Primary store

        public ICollection<UserStore> UserStores { get; set; } = new List<UserStore>();
    }
}
