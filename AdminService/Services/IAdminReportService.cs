using AdminService.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Services
{
    public interface IAdminReportService
    {
        Task<AdminReport?> GetByIdAsync(Guid id);
        Task<IEnumerable<AdminReport>> GetAllAsync();
        Task AddAsync(AdminReport report);
        Task<IEnumerable<AdminReport>> GetByTypeAsync(string reportType);
    }
}
