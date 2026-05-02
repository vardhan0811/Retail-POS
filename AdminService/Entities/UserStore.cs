using System;

namespace AdminService.Entities
{
    public class UserStore
    {
        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public Guid StoreId { get; set; }
        public Store Store { get; set; } = null!;

        public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    }
}
