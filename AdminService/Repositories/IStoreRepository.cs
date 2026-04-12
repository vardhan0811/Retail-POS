using AdminService.Entities;

namespace AdminService.Repositories
{
    public interface IStoreRepository
    {
        Task<List<Store>> GetAllAsync();
        Task<(IReadOnlyList<Store>, int)> GetPagedAsync(bool? isActive, string? search, int page, int pageSize);
        Task<Store?> GetByIdAsync(Guid id);
        Task AddAsync(Store store);
        Task UpdateAsync(Store store);
        Task DeleteAsync(Store store);
    }
}
