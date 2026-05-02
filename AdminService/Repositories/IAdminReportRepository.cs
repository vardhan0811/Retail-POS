using AdminService.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Repositories
{
    public interface IAdminReportRepository
    {
        Task<AdminReport?> GetByIdAsync(Guid id);
        Task<IEnumerable<AdminReport>> GetAllAsync();
        Task AddAsync(AdminReport report);
        Task UpdateAsync(AdminReport report);
        Task<IEnumerable<AdminReport>> GetByTypeAsync(string reportType);
        Task<AdminReport?> GetReportAsync(string reportType, Guid? storeId, DateTime date);
    }
}
