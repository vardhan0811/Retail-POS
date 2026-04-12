namespace BillingService.DTOs
{
    public class CreateBillRequest
    {
        [System.ComponentModel.DataAnnotations.Required]
        [System.ComponentModel.DataAnnotations.MinLength(1)]
        public List<BillItemRequest> Items { get; set; } = new();
    }

    public class BillItemRequest
    {
        [System.ComponentModel.DataAnnotations.Required]
        [NotEmptyGuid(ErrorMessage = "ProductId is required")]
        public Guid ProductId { get; set; }

        [System.ComponentModel.DataAnnotations.Range(1, int.MaxValue)]
        public int Quantity { get; set; }
    }
}
