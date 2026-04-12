using System.ComponentModel.DataAnnotations;

namespace BillingService.DTOs
{
    public class FinalizeBillRequest
    {
        [Required]
        [NotEmptyGuid(ErrorMessage = "PaymentId is required")]
        public Guid PaymentId { get; set; }
    }
}
