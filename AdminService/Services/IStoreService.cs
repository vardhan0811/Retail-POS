using AdminService.DTOs;

namespace AdminService.Services
{
    public interface IStoreService
    {
        Task<List<StoreDto>> GetAllAsync();
        Task<PagedResult<StoreDto>> GetPagedAsync(bool? isActive, string? search, int page, int pageSize);
        Task<StoreDto?> GetByIdAsync(Guid id);
        Task<StoreDto> CreateAsync(CreateStoreRequest request);
        Task<StoreDto> UpdateAsync(Guid id, UpdateStoreRequest request);
        Task DeleteAsync(Guid id);
    }
}
