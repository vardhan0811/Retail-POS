using ProductService.Entities;
using ProductService.DTOs;

namespace ProductService.Repositories
{
    public interface IProductRepository
    {
        // ---------------- BASIC CRUD ----------------
        Task AddAsync(Product product);
        Task<Product?> GetByIdAsync(Guid id);
        Task UpdateAsync(Product product);
        Task DeleteAsync(Product product);

        // ---------------- STOCK ----------------
        Task<ProductStock?> GetStockAsync(Guid productId, Guid storeId);
        Task UpdateStockAsync(ProductStock stock, StockHistory history);
        Task<IEnumerable<ProductStock>> GetProductStocksAsync(Guid productId);

        // ---------------- EXISTS ----------------
        Task<bool> ExistsBySKUAsync(string sku, Guid? excludeId = null);
        Task<bool> ExistsByBarcodeAsync(string barcode, Guid? excludeId = null);

        // ---------------- SEARCH ----------------
        Task<IEnumerable<Product>> SearchAsync(string query, Guid? storeId);

        // ---------------- PAGINATION ----------------
        Task<(IEnumerable<Product>, int)> GetPagedAsync(
            Guid? storeId,
            int page,
            int pageSize,
            string? search,
            decimal? minPrice,
            decimal? maxPrice,
            string? sortBy,
            Guid? categoryId = null);

        // ---------------- CATEGORY ----------------
        Task<IEnumerable<Category>> GetAllCategoriesAsync();
        Task<Category?> GetCategoryByIdAsync(Guid id);
        Task<Category> CreateCategoryAsync(Category category);
        Task<Category?> UpdateCategoryAsync(Guid id, Category update);
        Task<bool> DeleteCategoryAsync(Guid id);
        Task<bool> CategoryNameExistsAsync(string name, Guid? excludeId = null);

        // ---------------- TAX ----------------
        Task<IEnumerable<TaxConfiguration>> GetAllTaxesAsync();
        Task<TaxConfiguration?> GetTaxByIdAsync(Guid id);
        Task<TaxConfiguration> CreateTaxAsync(TaxConfiguration tax);
        Task<TaxConfiguration?> UpdateTaxAsync(Guid id, TaxConfiguration update);
        Task<bool> DeleteTaxAsync(Guid id);
        Task<bool> TaxNameExistsAsync(string name, Guid? excludeId = null);

        // ---------------- ANALYTICS & FILTERS ----------------
        Task<IEnumerable<Product>> GetLowStockAsync(Guid? storeId, int threshold);
        Task<IEnumerable<Product>> GetOutOfStockAsync(Guid? storeId);
        Task<StockSummaryDto> GetStockSummaryAsync(Guid? storeId);
        Task<bool> HasActiveProductsInCategoryAsync(Guid categoryId);
        Task<IEnumerable<Product>> GetTopSellingAsync(Guid? storeId, int count);

        // ---------------- ATOMICITY ----------------
        Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync();
        Task SaveChangesAsync();
        Task<IEnumerable<ProductStock>> GetStocksForStoreAsync(Guid storeId, List<Guid> productIds);
        Task<IEnumerable<Product>> GetProductsByIdsAsync(List<Guid> productIds);
        Task UpdateInventoryAtomicAsync(Product product, ProductStock stock, StockHistory history, string updatedByName);
    }
}