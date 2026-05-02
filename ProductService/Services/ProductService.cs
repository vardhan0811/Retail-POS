using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using ProductService.DTOs;
using ProductService.Entities;
using ProductService.Repositories;

namespace ProductService.Services
{
    public class ProductService : IProductService
    {
        private readonly IProductRepository _repository;
        private readonly IMemoryCache _cache;
        private readonly ILogger<ProductService> _logger;

        private readonly MemoryCacheEntryOptions _cacheOptions =
            new MemoryCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            };

        public ProductService(IProductRepository repository, IMemoryCache cache, ILogger<ProductService> logger)
        {
            _repository = repository;
            _cache = cache;
            _logger = logger;
        }

        // ---------------- PRODUCT ----------------
        public async Task<Product> CreateProductAsync(CreateProductRequest request)
        {
            if (request == null) throw new Middleware.BusinessException("Request cannot be null");
            
            if (await _repository.ExistsBySKUAsync(request.SKU))
                throw new Middleware.BusinessException("SKU already exists globally");

            if (!string.IsNullOrWhiteSpace(request.Barcode) &&
                await _repository.ExistsByBarcodeAsync(request.Barcode))
                throw new Middleware.BusinessException("Barcode already exists globally");

            var product = new Product
            {
                Id = Guid.NewGuid(),
                Name = request.Name.Trim(),
                SKU = request.SKU.Trim(),
                Barcode = request.Barcode ?? string.Empty,
                CategoryId = request.CategoryId,
                TaxId = request.TaxId,
                MRP = request.MRP,
                SellingPrice = request.SellingPrice,
                IsActive = true,
                IsRefundable = request.IsRefundable,
                RefundWindowHours = request.RefundWindowHours,
                ImageUrl = request.ImageUrl
            };

            await _repository.AddAsync(product);
            return product;
        }

        public async Task<Product> GetByIdAsync(Guid id)
        {
            var cacheKey = $"product_{id}";
            if (!_cache.TryGetValue(cacheKey, out Product? product))
            {
                product = await _repository.GetByIdAsync(id);
                if (product != null) _cache.Set(cacheKey, product, _cacheOptions);
            }

            if (product == null) throw new Middleware.NotFoundException($"Product {id} not found");
            return product;
        }

        public async Task<IEnumerable<Product>> SearchAsync(string query, Guid? storeId)
        {
            return await _repository.SearchAsync(query, storeId);
        }

        public async Task UpdateAsync(Guid id, UpdateProductRequest request)
        {
            await PatchAsync(id, request);
        }

        public async Task PatchAsync(Guid id, UpdateProductRequest request)
        {
            if (request == null) throw new Middleware.BusinessException("Invalid request");
            var product = await _repository.GetByIdAsync(id) ?? throw new Middleware.NotFoundException("Product not found");

            if (request.SKU != null && await _repository.ExistsBySKUAsync(request.SKU, id))
                throw new Middleware.BusinessException("SKU already exists");

            // Merge fields only if provided
            if (request.Name != null) product.Name = request.Name.Trim();
            if (request.SKU != null) product.SKU = request.SKU.Trim();
            if (request.Barcode != null) product.Barcode = request.Barcode;
            if (request.CategoryId.HasValue) product.CategoryId = request.CategoryId.Value;
            if (request.TaxId.HasValue) product.TaxId = request.TaxId.Value;
            if (request.MRP.HasValue) product.MRP = request.MRP.Value;
            if (request.SellingPrice.HasValue) product.SellingPrice = request.SellingPrice.Value;
            if (request.IsActive.HasValue) product.IsActive = request.IsActive.Value;
            if (request.IsRefundable.HasValue) product.IsRefundable = request.IsRefundable.Value;
            if (request.RefundWindowHours.HasValue) product.RefundWindowHours = request.RefundWindowHours.Value;
            
            // ImageUrl is specifically mentioned: DO NOT nullify if missing
            if (request.ImageUrl != null) product.ImageUrl = request.ImageUrl;

            await _repository.UpdateAsync(product);
            _cache.Remove($"product_{id}");
        }

        public async Task DeleteAsync(Guid id)
        {
            var product = await _repository.GetByIdAsync(id) ?? throw new Middleware.NotFoundException("Product not found");
            product.IsActive = false;
            await _repository.UpdateAsync(product);
            _cache.Remove($"product_{id}");
        }

        public async Task<PagedResult<Product>> GetPagedAsync(
            Guid? storeId,
            int page,
            int pageSize,
            string? search = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            string? sortBy = null,
            Guid? categoryId = null)
        {
            var (items, total) = await _repository.GetPagedAsync(storeId, page, pageSize, search, minPrice, maxPrice, sortBy, categoryId);
            return new PagedResult<Product> { Items = items, TotalCount = total };
        }

        // ---------------- STOCK ----------------
        public async Task FinalizeStockAsync(FinalizeStockRequest request)
        {
            if (request == null || !request.Items.Any()) return;

            var productIds = request.Items.Select(i => i.ProductId).ToList();
            
            // Start a transaction to ensure atomicity
            await using var transaction = await _repository.BeginTransactionAsync();
            try
            {
                // 1. Fetch all relevant stocks for this store
                var stocks = await _repository.GetStocksForStoreAsync(request.StoreId, productIds);
                var stocksDict = stocks.ToDictionary(s => s.ProductId);

                // 2. Fetch all relevant products (for de-normalized stock and total sold)
                var products = await _repository.GetProductsByIdsAsync(productIds);
                var productsDict = products.ToDictionary(p => p.Id);

                foreach (var item in request.Items)
                {
                    // Update Store-specific stock
                    if (stocksDict.TryGetValue(item.ProductId, out var stock))
                    {
                        stock.Quantity -= item.Quantity;
                        stock.ReservedQuantity = Math.Max(0, stock.ReservedQuantity - item.Quantity);
                        stock.UpdatedAt = DateTime.UtcNow;
                    }

                    // Update Global/Scoped Product de-normalized fields
                    if (productsDict.TryGetValue(item.ProductId, out var product))
                    {
                        product.Stock -= item.Quantity;
                        product.ReservedStock = Math.Max(0, product.ReservedStock - item.Quantity);
                        product.TotalSoldQuantity += item.Quantity;
                    }
                }

                // 3. Persist changes (RowVersion handled by EF Core if [Timestamp] is present)
                await _repository.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                await transaction.RollbackAsync();
                throw new Middleware.BusinessException("Inventory was updated by another process. Please retry the transaction.");
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                throw new Middleware.BusinessException($"Stock finalization failed: {ex.Message}");
            }
        }

        public async Task AdjustStockAsync(Guid productId, Guid storeId, int quantity, string action, Guid userId)
        {
            if (quantity == 0) throw new Middleware.BusinessException("Quantity cannot be zero");
            if (storeId == Guid.Empty) throw new Middleware.BusinessException("StoreId is required");

            var product = await _repository.GetByIdAsync(productId) ?? throw new Middleware.NotFoundException("Product not found");
            var stock = await _repository.GetStockAsync(productId, storeId) ?? new ProductStock
            {
                ProductId = productId,
                StoreId = storeId,
                Quantity = (product.StoreId == storeId) ? product.Stock : 0
            };

            var oldQuantity = stock.Quantity;
            var newQuantity = action.ToUpper() switch
            {
                "INCREMENT" => stock.Quantity + quantity,
                "DECREMENT" => stock.Quantity - quantity,
                "ADJUST" => quantity,
                _ => throw new Middleware.BusinessException("Invalid stock action")
            };

            if (newQuantity < 0) throw new Middleware.BusinessException("Stock cannot be negative");

            stock.Quantity = newQuantity;

            // Sync with Product de-normalized field if store matches
            if (product.StoreId == storeId)
            {
                product.Stock = newQuantity;
                await _repository.UpdateAsync(product);
            }
            
            var history = new StockHistory
            {
                Id = Guid.NewGuid(),
                ProductId = productId,
                StoreId = storeId,
                Change = newQuantity - oldQuantity,
                Action = action.ToUpper(),
                PerformedBy = userId,
                Timestamp = DateTime.UtcNow
            };

            await _repository.UpdateStockAsync(stock, history);
            _cache.Remove($"product_{productId}");
        }

        public async Task<object> UpdateInventoryAsync(InventoryUpdateRequest request, Guid userId, string updatedByName)
        {
            if (request.Change == 0) throw new Middleware.BusinessException("Change cannot be zero");
            if (request.StoreId == Guid.Empty) throw new Middleware.BusinessException("StoreId is required");

            var product = await _repository.GetByIdAsync(request.ProductId) ?? throw new Middleware.NotFoundException("Product not found");
            
            var stock = await _repository.GetStockAsync(request.ProductId, request.StoreId) ?? new ProductStock
            {
                ProductId = request.ProductId,
                StoreId = request.StoreId,
                Quantity = (product.StoreId == request.StoreId) ? product.Stock : 0
            };

            var newQuantity = stock.Quantity + request.Change;
            if (newQuantity < 0) throw new Middleware.BusinessException("Stock cannot be negative");

            stock.Quantity = newQuantity;
            stock.UpdatedAt = DateTime.UtcNow;

            // Sync with Product (for listing speed) if store matches
            if (product.StoreId == request.StoreId)
            {
                product.Stock = newQuantity;
            }

            // Create History
            var history = new StockHistory
            {
                Id = Guid.NewGuid(),
                ProductId = request.ProductId,
                StoreId = request.StoreId,
                Change = request.Change,
                Action = request.Change > 0 ? "INCREMENT" : "DECREMENT",
                PerformedBy = userId,
                Timestamp = DateTime.UtcNow
            };

            try 
            {
                await _repository.UpdateInventoryAtomicAsync(product, stock, history, updatedByName);
                
                _logger.LogInformation("[Inventory] Stock updated for Product: {ProductId} at Store: {StoreId}. Change: {Change}, New Stock: {NewStock}", 
                    request.ProductId, request.StoreId, request.Change, newQuantity);

                _cache.Remove($"product_{request.ProductId}");
                return new { 
                    productId = request.ProductId, 
                    newStock = newQuantity,
                    updatedAt = DateTime.UtcNow,
                    lastUpdatedBy = updatedByName
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update inventory for product {ProductId}", request.ProductId);
                throw new Middleware.BusinessException($"Inventory update failed: {ex.Message}");
            }
        }

        public async Task<StockSummaryDto> GetStockSummaryAsync(Guid? storeId)
        {
            return await _repository.GetStockSummaryAsync(storeId);
        }

        public async Task<IEnumerable<ProductStock>> GetProductStocksAsync(Guid productId)
        {
            return await _repository.GetProductStocksAsync(productId);
        }

        // ---------------- CATEGORY ----------------
        public async Task<IEnumerable<Category>> GetAllCategoriesAsync()
        {
            return await _repository.GetAllCategoriesAsync();
        }

        public async Task<Category?> GetCategoryByIdAsync(Guid id)
        {
            return await _repository.GetCategoryByIdAsync(id);
        }

        public async Task<Category> CreateCategoryAsync(CreateCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name)) throw new Middleware.BusinessException("Name required");
            if (await _repository.CategoryNameExistsAsync(request.Name.Trim()))
                throw new Middleware.BusinessException("Category already exists");

            return await _repository.CreateCategoryAsync(new Category { Name = request.Name.Trim(), IsActive = true });
        }

        public async Task<Category?> UpdateCategoryAsync(Guid id, UpdateCategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name)) throw new Middleware.BusinessException("Name required");
            return await _repository.UpdateCategoryAsync(id, new Category { Name = request.Name.Trim() });
        }

        public async Task<bool> DeleteCategoryAsync(Guid id)
        {
            if (await _repository.HasActiveProductsInCategoryAsync(id))
                throw new Middleware.BusinessException("Cannot delete category with products");
            return await _repository.DeleteCategoryAsync(id);
        }

        // ---------------- TAX ----------------
        public async Task<IEnumerable<TaxConfiguration>> GetAllTaxesAsync()
        {
            return await _repository.GetAllTaxesAsync();
        }

        public async Task<TaxConfiguration?> GetTaxByIdAsync(Guid id)
        {
            return await _repository.GetTaxByIdAsync(id);
        }

        public async Task<TaxConfiguration> CreateTaxAsync(CreateTaxRequest request)
        {
            return await _repository.CreateTaxAsync(new TaxConfiguration
            {
                Name = request.Name.Trim(),
                Percentage = request.Percentage
            });
        }

        public async Task<TaxConfiguration?> UpdateTaxAsync(Guid id, UpdateTaxRequest request)
        {
            return await _repository.UpdateTaxAsync(id, new TaxConfiguration
            {
                Name = request.Name.Trim(),
                Percentage = request.Percentage
            });
        }

        public async Task<bool> DeleteTaxAsync(Guid id)
        {
            return await _repository.DeleteTaxAsync(id);
        }

        // ---------------- FILTERS & ANALYTICS ----------------
        public async Task<IEnumerable<Product>> GetLowStockAsync(Guid? storeId, int threshold)
        {
            return await _repository.GetLowStockAsync(storeId, threshold);
        }

        public async Task<IEnumerable<Product>> GetOutOfStockAsync(Guid? storeId)
        {
            return await _repository.GetOutOfStockAsync(storeId);
        }

        public async Task<IEnumerable<Product>> GetTopSellingAsync(Guid? storeId, int count)
        {
            return await _repository.GetTopSellingAsync(storeId, count);
        }
    }
}