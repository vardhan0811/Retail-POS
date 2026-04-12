using AdminService.DTOs;
using AdminService.Entities;
using AdminService.Middleware;
using AdminService.Repositories;

namespace AdminService.Services
{
    public class StoreService : IStoreService
    {
        private readonly IStoreRepository _repo;

        public StoreService(IStoreRepository repo)
        {
            _repo = repo;
        }

        public async Task<List<StoreDto>> GetAllAsync()
        {
            var stores = await _repo.GetAllAsync();
            return stores.Select(ToDto).ToList();
        }

        public async Task<PagedResult<StoreDto>> GetPagedAsync(bool? isActive, string? search, int page, int pageSize)
        {
            var (stores, totalCount) = await _repo.GetPagedAsync(isActive, search, page, pageSize);
            return new PagedResult<StoreDto>
            {
                Items = stores.Select(ToDto).ToList(),
                TotalCount = totalCount
            };
        }

        public async Task<StoreDto?> GetByIdAsync(Guid id)
        {
            if (id == Guid.Empty)
                throw new BusinessException("Store id is required");

            var store = await _repo.GetByIdAsync(id);
            return store == null ? null : ToDto(store);
        }

        public async Task<StoreDto> CreateAsync(CreateStoreRequest request)
        {
            if (request == null)
                throw new BusinessException("Store request is required");
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BusinessException("Store name is required");
            if (string.IsNullOrWhiteSpace(request.Location))
                throw new BusinessException("Store location is required");

            var store = new Store
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                Location = request.Location.Trim(),
                Address = request.Address?.Trim() ?? string.Empty,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _repo.AddAsync(store);
            return ToDto(store);
        }

        public async Task<StoreDto> UpdateAsync(Guid id, UpdateStoreRequest request)
        {
            if (id == Guid.Empty)
                throw new BusinessException("Store id is required");
            if (request == null)
                throw new BusinessException("Store request is required");
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BusinessException("Store name is required");
            if (string.IsNullOrWhiteSpace(request.Location))
                throw new BusinessException("Store location is required");

            var store = await _repo.GetByIdAsync(id);
            if (store == null)
                throw new NotFoundException("Store not found");

            store.Name = request.Name.Trim();
            store.Location = request.Location.Trim();
            store.Address = request.Address?.Trim() ?? string.Empty;
            store.IsActive = request.IsActive;

            await _repo.UpdateAsync(store);
            return ToDto(store);
        }

        public async Task DeleteAsync(Guid id)
        {
            if (id == Guid.Empty)
                throw new BusinessException("Store id is required");

            var store = await _repo.GetByIdAsync(id);
            if (store == null)
                throw new NotFoundException("Store not found");

            await _repo.DeleteAsync(store);
        }

        private static StoreDto ToDto(Store store)
        {
            return new StoreDto
            {
                Id = store.Id,
                Name = store.Name,
                Location = store.Location,
                Address = store.Address,
                IsActive = store.IsActive,
                CreatedAt = store.CreatedAt
            };
        }
    }
}
