namespace AdminService.Entities
{
    public class ProcessedMessage
    {
        public Guid Id { get; set; }
        public Guid MessageId { get; set; }
        public DateTime ProcessedAt { get; set; }
    }
}
