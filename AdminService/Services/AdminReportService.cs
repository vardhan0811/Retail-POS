using AdminService.Entities;
using AdminService.Repositories;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Services
{
    public class AdminReportService : IAdminReportService
    {
        private readonly IAdminReportRepository _repo;
        public AdminReportService(IAdminReportRepository repo) { _repo = repo; }
        public async Task<AdminReport?> GetByIdAsync(Guid id) => await _repo.GetByIdAsync(id);
        public async Task<IEnumerable<AdminReport>> GetAllAsync() => await _repo.GetAllAsync();
        public async Task AddAsync(AdminReport report) => await _repo.AddAsync(report);
        public async Task<IEnumerable<AdminReport>> GetByTypeAsync(string reportType) => await _repo.GetByTypeAsync(reportType);
    }
}
