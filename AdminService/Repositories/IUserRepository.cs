using AdminService.Entities;
using Shared.Contracts.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<IEnumerable<User>> GetAllAsync();
        Task<(IReadOnlyList<User>, int)> GetPagedAsync(Guid? storeId, string? role, UserStatus? status, int page, int pageSize);
        Task<IReadOnlyList<string>> GetDistinctRolesAsync();
        Task AddAsync(User user);
        Task UpdateAsync(User user);
        Task DeleteAsync(Guid id);
        
        // Multi-store support
        Task AddUserStoreAsync(UserStore userStore);
        Task RemoveUserStoreAsync(Guid userId, Guid storeId);
        Task ClearUserStoresAsync(Guid userId);
    }
}
