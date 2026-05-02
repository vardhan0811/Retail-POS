using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProductService.Data;
using ProductService.DTOs;
using ProductService.Entities;

namespace ProductService.Repositories
{
    public class ProductRepository : IProductRepository
    {
        private readonly ProductDbContext _context;
        private readonly ILogger<ProductRepository> _logger;

        public ProductRepository(ProductDbContext context, ILogger<ProductRepository> logger)
        {
            _context = context;
            _logger = logger;
        }

        // ---------------- BASIC CRUD ----------------
        public async Task AddAsync(Product product)
        {
            await _context.Products.AddAsync(product);
            await _context.SaveChangesAsync();
        }

        public async Task UpdateAsync(Product product)
        {
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(Product product)
        {
            _context.Products.Update(product);
            await _context.SaveChangesAsync();
        }

        public async Task<Product?> GetByIdAsync(Guid id)
        {
            return await _context.Products
                .Include(p => p.Tax)
                .Include(p => p.Category)
                .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);
        }

        // ---------------- STOCK ----------------
        public async Task<ProductStock?> GetStockAsync(Guid productId, Guid storeId)
        {
            return await _context.ProductStocks
                .FirstOrDefaultAsync(ps => ps.ProductId == productId && ps.StoreId == storeId);
        }

        public async Task UpdateStockAsync(ProductStock stock, StockHistory history)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var existing = await _context.ProductStocks
                    .FirstOrDefaultAsync(ps => ps.ProductId == stock.ProductId && ps.StoreId == stock.StoreId);

                if (existing == null)
                {
                    await _context.ProductStocks.AddAsync(stock);
                }
                else
                {
                    existing.Quantity = stock.Quantity;
                    existing.ReservedQuantity = stock.ReservedQuantity;
                    existing.UpdatedAt = DateTime.UtcNow;
                }

                await _context.StockHistories.AddAsync(history);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        }

        public async Task<IEnumerable<ProductStock>> GetProductStocksAsync(Guid productId)
        {
            return await _context.ProductStocks
                .Where(ps => ps.ProductId == productId)
                .ToListAsync();
        }

        // ---------------- EXISTS ----------------
        public async Task<bool> ExistsBySKUAsync(string sku, Guid? excludeId = null)
        {
            return await _context.Products.AnyAsync(p =>
                p.SKU == sku && p.IsActive && (!excludeId.HasValue || p.Id != excludeId));
        }

        public async Task<bool> ExistsByBarcodeAsync(string barcode, Guid? excludeId = null)
        {
            return await _context.Products.AnyAsync(p =>
                p.Barcode == barcode && p.IsActive && (!excludeId.HasValue || p.Id != excludeId));
        }

        // ---------------- SEARCH ----------------
        public async Task<IEnumerable<Product>> SearchAsync(string query, Guid? storeId)
        {
            if (string.IsNullOrWhiteSpace(query)) return Enumerable.Empty<Product>();
            var normalized = query.Trim();

            var baseQuery = _context.Products
                .Include(p => p.Tax)
                .Where(p => p.IsActive)
                .Where(p =>
                    p.Name.Contains(normalized) ||
                    p.SKU.Contains(normalized) ||
                    p.Barcode.Contains(normalized));

            var items = await baseQuery.ToListAsync();
            return items;
        }

        // ---------------- PAGINATION ----------------
        public async Task<(IEnumerable<Product>, int)> GetPagedAsync(
            Guid? storeId,
            int page,
            int pageSize,
            string? search,
            decimal? minPrice,
            decimal? maxPrice,
            string? sortBy,
            Guid? categoryId = null)
        {
            var query = _context.Products
                .Include(p => p.Tax)
                .Include(p => p.Category)
                .Where(p => p.IsActive)
                .AsQueryable();

            var globalActiveCount = await query.CountAsync();
            _logger.LogInformation("[ProductRepository] Global active products count: {Count}", globalActiveCount);

            if (storeId.HasValue)
                query = query.Where(p => p.StoreId == storeId.Value);
            
            var filteredCount = await query.CountAsync();
            _logger.LogInformation("[ProductRepository] Products count for StoreId {StoreId}: {Count}", storeId, filteredCount);

            if (categoryId.HasValue)
                query = query.Where(p => p.CategoryId == categoryId.Value);

            if (!string.IsNullOrWhiteSpace(search))
            {
                var s = search.Trim();
                query = query.Where(p => p.Name.Contains(s) || p.SKU.Contains(s) || p.Barcode.Contains(s));
            }

            if (minPrice.HasValue) query = query.Where(p => p.SellingPrice >= minPrice.Value);
            if (maxPrice.HasValue) query = query.Where(p => p.SellingPrice <= maxPrice.Value);

            var total = await query.CountAsync();

            // Apply Sorting
            query = sortBy switch
            {
                "price_asc" => query.OrderBy(p => p.SellingPrice),
                "price_desc" => query.OrderByDescending(p => p.SellingPrice),
                "name_desc" => query.OrderByDescending(p => p.Name),
                _ => query.OrderBy(p => p.Name)
            };

            var items = await query.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();

            return (items, total);
        }

        // ---------------- CATEGORY ----------------
        public async Task<IEnumerable<Category>> GetAllCategoriesAsync()
        {
            return await _context.Categories.Where(c => c.IsActive).OrderBy(c => c.Name).ToListAsync();
        }

        public async Task<Category?> GetCategoryByIdAsync(Guid id)
        {
            return await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
        }

        public async Task<Category> CreateCategoryAsync(Category category)
        {
            if (category.Id == Guid.Empty) category.Id = Guid.NewGuid();
            await _context.Categories.AddAsync(category);
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task<Category?> UpdateCategoryAsync(Guid id, Category update)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
            if (category == null) return null;
            category.Name = update.Name;
            await _context.SaveChangesAsync();
            return category;
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            var category = await _context.Categories.FirstOrDefaultAsync(c => c.Id == id && c.IsActive);
            if (category == null) return false;
            category.IsActive = false;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> CategoryNameExistsAsync(string name, Guid? excludeId = null)
        {
            return await _context.Categories.AnyAsync(c => 
                c.Name == name && c.IsActive && (!excludeId.HasValue || c.Id != excludeId));
        }

        // ---------------- TAX ----------------
        public async Task<IEnumerable<TaxConfiguration>> GetAllTaxesAsync()
        {
            return await _context.Taxes.OrderBy(t => t.Name).ToListAsync();
        }

        public async Task<TaxConfiguration?> GetTaxByIdAsync(Guid id)
        {
            return await _context.Taxes.FirstOrDefaultAsync(t => t.Id == id);
        }

        public async Task<TaxConfiguration> CreateTaxAsync(TaxConfiguration tax)
        {
            if (tax.Id == Guid.Empty) tax.Id = Guid.NewGuid();
            await _context.Taxes.AddAsync(tax);
            await _context.SaveChangesAsync();
            return tax;
        }

        public async Task<TaxConfiguration?> UpdateTaxAsync(Guid id, TaxConfiguration update)
        {
            var tax = await _context.Taxes.FirstOrDefaultAsync(t => t.Id == id);
            if (tax == null) return null;
            tax.Name = update.Name;
            tax.Percentage = update.Percentage;
            await _context.SaveChangesAsync();
            return tax;
        }

        public async Task<bool> DeleteTaxAsync(Guid id)
        {
            var tax = await _context.Taxes.FirstOrDefaultAsync(t => t.Id == id);
            if (tax == null) return false;
            _context.Taxes.Remove(tax);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> TaxNameExistsAsync(string name, Guid? excludeId = null)
        {
            return await _context.Taxes.AnyAsync(t => 
                t.Name == name && (!excludeId.HasValue || t.Id != excludeId));
        }

        // ---------------- ANALYTICS & FILTERS ----------------
        public async Task<IEnumerable<Product>> GetLowStockAsync(Guid? storeId, int threshold)
        {
            var query = _context.Products.Include(p => p.Tax).Where(p => p.IsActive);
            
            if (storeId.HasValue)
            {
                query = query.Where(p => p.StoreId == storeId.Value && p.Stock <= threshold);
            }
            else
            {
                query = query.Where(p => p.Stock <= threshold);
            }

            return await query.ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetOutOfStockAsync(Guid? storeId)
        {
            var query = _context.Products.Include(p => p.Tax).Where(p => p.IsActive);

            if (storeId.HasValue)
            {
                query = query.Where(p => p.StoreId == storeId.Value && p.Stock == 0);
            }
            else
            {
                query = query.Where(p => p.Stock == 0);
            }

            return await query.ToListAsync();
        }

        public async Task<StockSummaryDto> GetStockSummaryAsync(Guid? storeId)
        {
            var query = _context.Products.Where(p => p.IsActive);
            if (storeId.HasValue)
                query = query.Where(p => p.StoreId == storeId.Value);

            var totalCount = await query.CountAsync();
            var lowCount = await query.CountAsync(p => p.Stock > 0 && p.Stock <= 10);
            var outCount = await query.CountAsync(p => p.Stock == 0);

            return new StockSummaryDto { Total = totalCount, Low = lowCount, OutOfStock = outCount };
        }

        public async Task<bool> HasActiveProductsInCategoryAsync(Guid categoryId)
        {
            return await _context.Products.AnyAsync(p => p.CategoryId == categoryId && p.IsActive);
        }

        public async Task<IEnumerable<Product>> GetTopSellingAsync(Guid? storeId, int count)
        {
            var query = _context.Products.Include(p => p.Tax)
                .Where(p => p.IsActive);

            if (storeId.HasValue)
                query = query.Where(p => p.StoreId == storeId.Value);

            return await query
                .OrderByDescending(p => p.TotalSoldQuantity)
                .Take(count)
                .ToListAsync();
        }

        // ---------------- ATOMICITY ----------------
        public async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }

        public async Task SaveChangesAsync()
        {
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<ProductStock>> GetStocksForStoreAsync(Guid storeId, List<Guid> productIds)
        {
            return await _context.ProductStocks
                .Where(ps => ps.StoreId == storeId && productIds.Contains(ps.ProductId))
                .ToListAsync();
        }

        public async Task<IEnumerable<Product>> GetProductsByIdsAsync(List<Guid> productIds)
        {
            return await _context.Products
                .Where(p => productIds.Contains(p.Id))
                .ToListAsync();
        }

        public async Task UpdateInventoryAtomicAsync(Product product, ProductStock stock, StockHistory history, string updatedByName)
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // 1. Update Product
                product.UpdatedAt = DateTime.UtcNow;
                product.UpdatedBy = updatedByName;
                _context.Entry(product).State = EntityState.Modified;

                // 2. Update/Add Stock
                stock.UpdatedAt = DateTime.UtcNow;
                stock.LastUpdatedBy = updatedByName;

                var existingStock = await _context.ProductStocks.AsNoTracking()
                    .FirstOrDefaultAsync(ps => ps.ProductId == stock.ProductId && ps.StoreId == stock.StoreId);
                
                if (existingStock == null)
                {
                    await _context.ProductStocks.AddAsync(stock);
                }
                else
                {
                    _context.Entry(stock).State = EntityState.Modified;
                }

                // 3. Add History
                await _context.StockHistories.AddAsync(history);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                _logger.LogError(ex, "Atomic inventory update failed for product {ProductId}", product.Id);
                throw;
            }
        }
    }
}