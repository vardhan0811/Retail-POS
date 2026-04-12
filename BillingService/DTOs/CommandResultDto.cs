namespace BillingService.DTOs
{
    public class CommandResultDto
    {
        public Guid BillId { get; set; }
        public string Action { get; set; } = string.Empty;
    }
}
