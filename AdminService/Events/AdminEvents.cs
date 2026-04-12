namespace AdminService.Events
{
    public class AdminActionEvent
    {
        public Guid AdminId { get; set; }
        public string Action { get; set; } = string.Empty;
        public string Details { get; set; } = string.Empty;
        public DateTime ActionAt { get; set; }
    }
}
