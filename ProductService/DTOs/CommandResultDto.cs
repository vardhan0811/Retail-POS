namespace ProductService.DTOs
{
    public class CommandResultDto
    {
        public string Action { get; set; } = string.Empty;
        public Guid? ResourceId { get; set; }
    }
}
