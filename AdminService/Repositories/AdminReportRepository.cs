using AdminService.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using AdminService.Data;

namespace AdminService.Repositories
{
    public class AdminReportRepository : IAdminReportRepository
    {
        private readonly AdminDbContext _context;
        public AdminReportRepository(AdminDbContext context) { _context = context; }
        public async Task<AdminReport?> GetByIdAsync(Guid id) => await _context.AdminReports.FindAsync(id);
        public async Task<IEnumerable<AdminReport>> GetAllAsync() => await _context.AdminReports.ToListAsync();
        public async Task AddAsync(AdminReport report) { await _context.AdminReports.AddAsync(report); await _context.SaveChangesAsync(); }
        public async Task UpdateAsync(AdminReport report) { _context.AdminReports.Update(report); await _context.SaveChangesAsync(); }
        public async Task<IEnumerable<AdminReport>> GetByTypeAsync(string reportType) => await _context.AdminReports.Where(r => r.ReportType == reportType).ToListAsync();
        public async Task<AdminReport?> GetReportAsync(string reportType, Guid? storeId, DateTime date)
        {
            var query = _context.AdminReports
                .Where(r => r.ReportType == reportType && r.CreatedAt.Date == date.Date);

            if (storeId.HasValue)
                query = query.Where(r => r.StoreId == storeId.Value);

            return await query.FirstOrDefaultAsync();
        }
    }
}
