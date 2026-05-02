using AdminService.Entities;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Threading.Tasks;
using AdminService.Data;
using Shared.Contracts.Models;

namespace AdminService.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly AdminDbContext _context;
        public UserRepository(AdminDbContext context) { _context = context; }

        public async Task<User?> GetByIdAsync(Guid id) => 
            await _context.Users
                .Include(u => u.UserStores)
                    .ThenInclude(us => us.Store)
                .FirstOrDefaultAsync(u => u.Id == id);

        public async Task<IEnumerable<User>> GetAllAsync() => 
            await _context.Users
                .Include(u => u.UserStores)
                    .ThenInclude(us => us.Store)
                .ToListAsync();

        public async Task<(IReadOnlyList<User>, int)> GetPagedAsync(Guid? storeId, string? role, UserStatus? status, int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 20 : pageSize;

            var query = _context.Users
                .Include(u => u.UserStores)
                    .ThenInclude(us => us.Store)
                .AsNoTracking()
                .AsQueryable();

            if (storeId.HasValue)
            {
                // Find users assigned to this specific store via Primary or UserStores
                query = query.Where(u => u.StoreId == storeId.Value || u.UserStores.Any(us => us.StoreId == storeId.Value));
            }

            if (!string.IsNullOrWhiteSpace(role))
                query = query.Where(u => u.Role == role);

            if (status.HasValue)
                query = query.Where(u => u.Status == status.Value);

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

        public async Task AddUserStoreAsync(UserStore userStore)
        {
            await _context.UserStores.AddAsync(userStore);
            await _context.SaveChangesAsync();
        }

        public async Task RemoveUserStoreAsync(Guid userId, Guid storeId)
        {
            var existing = await _context.UserStores.FindAsync(userId, storeId);
            if (existing != null)
            {
                _context.UserStores.Remove(existing);
                await _context.SaveChangesAsync();
            }
        }

        public async Task ClearUserStoresAsync(Guid userId)
        {
            var stores = await _context.UserStores.Where(us => us.UserId == userId).ToListAsync();
            _context.UserStores.RemoveRange(stores);
            await _context.SaveChangesAsync();
        }
    }
}
