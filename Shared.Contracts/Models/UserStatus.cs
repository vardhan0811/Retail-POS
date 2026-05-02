namespace Shared.Contracts.Models
{
    public enum UserStatus
    {
        Invited = 0,
        Registered = 1,
        PendingApproval = 2,
        Active = 3,
        Suspended = 4,
        Locked = 5,
        Rejected = 6
    }
}
