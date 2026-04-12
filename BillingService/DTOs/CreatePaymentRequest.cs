using System.ComponentModel.DataAnnotations;

namespace BillingService.DTOs
{
    public class CreatePaymentRequest
    {
        [Required]
        [NotEmptyGuid(ErrorMessage = "BillId is required")]
        public Guid BillId { get; set; }

        [Required]
        [MinLength(1)]
        [MaxLength(30)]
        public string Method { get; set; } = string.Empty;
    }
}
