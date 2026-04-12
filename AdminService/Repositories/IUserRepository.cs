using AdminService.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<IEnumerable<User>> GetAllAsync();
        Task<(IReadOnlyList<User>, int)> GetPagedAsync(Guid? storeId, string? role, bool? isActive, int page, int pageSize);
        Task<IReadOnlyList<string>> GetDistinctRolesAsync();
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(Guid id);
    }
}
