namespace AdminService.Entities
{
    public class User
    {
        public Guid Id { get; set; }
        public string UserName { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public bool IsActive { get; set; }
        public Guid StoreId { get; set; }
        public ICollection<AdminReport> AdminReports { get; set; } = new List<AdminReport>();
    }
}
