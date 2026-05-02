namespace ProductService.Events
{
    public class StoreDeactivatedEvent
    {
        public Guid MessageId { get; set; }
        public Guid StoreId { get; set; }
        public DateTime OccurredAt { get; set; }
    }
}
