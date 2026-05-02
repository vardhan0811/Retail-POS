namespace BillingService.Entities 
{ 
    public enum BillStatus 
    { 
        Draft = 1,
        Authorized = 2,
        Finalized = 3,
        Refunded = 4,
        Cancelled = 5,
        AwaitingPayment = 6,
        Suspended = 7,
        RefundRequested = 8,
        Expired = 9,
        PartialRefund = 10
    } 
}
