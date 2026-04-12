using AdminService.Data;
using AdminService.Entities;
using Microsoft.EntityFrameworkCore;

namespace AdminService.Repositories
{
    public class StoreRepository : IStoreRepository
    {
        private readonly AdminDbContext _context;

        public StoreRepository(AdminDbContext context)
        {
            _context = context;
        }

        public async Task<List<Store>> GetAllAsync()
        {
            return await _context.Stores
                .AsNoTracking()
                .Where(s => s.IsActive)
                .ToListAsync();
        }

        public async Task<(IReadOnlyList<Store>, int)> GetPagedAsync(bool? isActive, string? search, int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 20 : pageSize;

            var query = _context.Stores.AsNoTracking().AsQueryable();

            query = isActive.HasValue
                ? query.Where(s => s.IsActive == isActive.Value)
                : query.Where(s => s.IsActive);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(s => s.Name.Contains(term) || s.Location.Contains(term) || s.Address.Contains(term));
            }

            query = query.OrderBy(s => s.Name);

            var total = await query.CountAsync();
            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, total);
        }

        public async Task<Store?> GetByIdAsync(Guid id)
        {
            return await _context.Stores.FirstOrDefaultAsync(s => s.Id == id && s.IsActive);
        }

        public async Task AddAsync(Store store)
        {
            await _context.Stores.AddAsync(store);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Store store)
        {
            _context.Stores.Update(store);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Store store)
        {
            store.IsActive = false;
            _context.Stores.Update(store);
            await _context.SaveChangesAsync();
        }
    }
}
