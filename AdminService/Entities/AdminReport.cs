namespace AdminService.Entities
{
    public class AdminReport
    {
        public Guid Id { get; set; }
        public string ReportType { get; set; } = string.Empty; // e.g., DAILY_SUMMARY
        public Guid StoreId { get; set; }
        public DateTime CreatedAt { get; set; }
        public string Data { get; set; } = string.Empty; // JSON Precomputed Analytics
    }
}

