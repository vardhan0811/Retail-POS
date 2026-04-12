namespace AdminService.DTOs
{
    public class AdminReportDto
    {
        public Guid Id { get; set; }
        public string ReportType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
        public string Data { get; set; } = string.Empty;
    }
}
