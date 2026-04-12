using AdminService.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using AdminService.Data;

namespace AdminService.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AdminDbContext _context;
        public UserRepository(AdminDbContext context) { _context = context; }
        public async Task<User?> GetByIdAsync(Guid id) => await _context.Users.FindAsync(id);
        public async Task<IEnumerable<User>> GetAllAsync() => await _context.Users.ToListAsync();

        public async Task<(IReadOnlyList<User>, int)> GetPagedAsync(Guid? storeId, string? role, bool? isActive, int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 20 : pageSize;

            var query = _context.Users.AsNoTracking().AsQueryable();

            if (storeId.HasValue)
                query = query.Where(u => u.StoreId == storeId.Value);

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role == role);

            if (isActive.HasValue)
                query = query.Where(u => u.IsActive == isActive.Value);

            query = query.OrderBy(u => u.UserName);

            var total = await query.CountAsync();
            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
            return (items, total);
        }

        public async Task<IReadOnlyList<string>> GetDistinctRolesAsync()
        {
            return await _context.Users
                .AsNoTracking()
                .Where(u => !string.IsNullOrWhiteSpace(u.Role))
                .Select(u => u.Role)
                .Distinct()
                .OrderBy(r => r)
                .ToListAsync();
        }

        public async Task AddAsync(User user) { await _context.Users.AddAsync(user); await _context.SaveChangesAsync(); }
        public async Task UpdateAsync(User user) { _context.Users.Update(user); await _context.SaveChangesAsync(); }
        public async Task DeleteAsync(Guid id) { var user = await _context.Users.FindAsync(id); if (user != null) { _context.Users.Remove(user); await _context.SaveChangesAsync(); } }
    }
}
