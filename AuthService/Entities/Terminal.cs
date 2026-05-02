using System;
using Shared.Contracts.Models;

namespace AuthService.Entities
{
    public class Terminal
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Guid StoreId { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime? LastActive { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
