namespace ProductService.Entities
{
    public class ProcessedMessage
    {
        public Guid Id {  get; set; }

        //This is the unique identifier of the event
        public Guid MessageId { get; set; }
        public DateTime ProcessedAt { get; set; }
    }
}
