using ProductService.DTOs;
using ProductService.Entities;

namespace ProductService.Services
{
    public interface IProductService
    {
        // ---------------- PRODUCT ----------------
        Task<Product> CreateProductAsync(CreateProductRequest request);
        Task<Product> GetByIdAsync(Guid id);
        Task<IEnumerable<Product>> SearchAsync(string query, Guid? storeId);
        Task UpdateAsync(Guid id, UpdateProductRequest request);
        Task PatchAsync(Guid id, UpdateProductRequest request);
        Task DeleteAsync(Guid id);

        Task<PagedResult<Product>> GetPagedAsync(
            Guid? storeId,
            int page,
            int pageSize,
            string? search = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            string? sortBy = null,
            Guid? categoryId = null);

        // ---------------- STOCK ----------------
        Task AdjustStockAsync(Guid productId, Guid storeId, int quantity, string action, Guid userId);
        Task<object> UpdateInventoryAsync(InventoryUpdateRequest request, Guid userId, string updatedByName);
        Task FinalizeStockAsync(FinalizeStockRequest request);
        Task<StockSummaryDto> GetStockSummaryAsync(Guid? storeId);
        Task<IEnumerable<ProductStock>> GetProductStocksAsync(Guid productId);

        // ---------------- CATEGORY ----------------
        Task<IEnumerable<Category>> GetAllCategoriesAsync();
        Task<Category?> GetCategoryByIdAsync(Guid id);
        Task<Category> CreateCategoryAsync(CreateCategoryRequest request);
        Task<Category?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request);
        Task<bool> DeleteCategoryAsync(Guid id);

        // ---------------- TAX ----------------
        Task<IEnumerable<TaxConfiguration>> GetAllTaxesAsync();
        Task<TaxConfiguration?> GetTaxByIdAsync(Guid id);
        Task<TaxConfiguration> CreateTaxAsync(CreateTaxRequest request);
        Task<TaxConfiguration?> UpdateTaxAsync(Guid id, UpdateTaxRequest request);
        Task<bool> DeleteTaxAsync(Guid id);

        // ---------------- FILTERS & ANALYTICS ----------------
        Task<IEnumerable<Product>> GetLowStockAsync(Guid? storeId, int threshold);
        Task<IEnumerable<Product>> GetOutOfStockAsync(Guid? storeId);
        Task<IEnumerable<Product>> GetTopSellingAsync(Guid? storeId, int count);
    }
}