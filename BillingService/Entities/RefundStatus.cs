namespace BillingService.Entities
{
    public enum RefundStatus
    {
        REQUESTED = 1,
        UNDER_REVIEW = 2,
        APPROVED = 3,
        SETTLED = 4,
        REJECTED = 5,
        FAILED = 6,
        PENDING_APPROVAL = 7, // Kept for backward compatibility mapping
        COMPLETED = 8         // Kept for backward compatibility mapping
    }
}
