using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ProductService.DTOs;
using ProductService.Entities;
using ProductService.Services;
using System.Security.Claims;

namespace ProductService.Controllers
{
    [ApiController]
    [Route("api/products")]
    [Authorize]
    public class ProductController : ControllerBase
    {
        private readonly IProductService _productService;
        private readonly ILogger<ProductController> _logger;

        public ProductController(IProductService productService, ILogger<ProductController> logger)
        {
            _productService = productService;
            _logger = logger;
        }

        // ---------------- AUTH HELPERS ----------------
        private Guid? GetStoreIdContext(Guid? requestedStoreId = null)
        {
            var role = User.FindFirstValue(ClaimTypes.Role);
            if (role == "Admin")
            {
                // Admin can choose a store or view all (null)
                return requestedStoreId;
            }

            // Cashiers MUST use their assigned store
            var storeIdStr = User.FindFirstValue("storeId") ?? User.FindFirstValue("StoreId");
            if (Guid.TryParse(storeIdStr, out var assignedStoreId))
            {
                return assignedStoreId;
            }

            throw new UnauthorizedAccessException("Assigned store not found for cashier.");
        }

        private Guid GetPerformingUserId()
        {
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(userIdStr, out var userId) ? userId : Guid.Empty;
        }

        private string GetPerformingUserName()
        {
            return User.FindFirstValue(ClaimTypes.Name) ?? User.Identity?.Name ?? "System";
        }

        // ---------------- PRODUCT CATALOG ----------------
        [Authorize(Policy = "CREATE_PRODUCT")]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var product = await _productService.CreateProductAsync(request);
            return Ok(new ApiResponse<Product> { Message = "Product created in catalog", Success = true, Data = product });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] Guid? storeId = null,
            int page = 1,
            int pageSize = 20,
            string? search = null,
            decimal? minPrice = null,
            decimal? maxPrice = null,
            string? sortBy = null,
            Guid? categoryId = null)
        {
            var effectiveStoreId = GetStoreIdContext(storeId);
            
            var role = User.FindFirstValue(ClaimTypes.Role);
            var claimStoreId = User.FindFirstValue("storeId") ?? User.FindFirstValue("StoreId");
            _logger.LogInformation("[ProductController] GetAll requested. StoreId param: {StoreId}, Role: {Role}, ClaimStoreId: {ClaimStoreId}, EffectiveStoreId: {EffectiveStoreId}", 
                storeId, role, claimStoreId, effectiveStoreId);

            var result = await _productService.GetPagedAsync(effectiveStoreId, page, pageSize, search, minPrice, maxPrice, sortBy, categoryId);
            
            return Ok(new ApiResponse<PagedResult<Product>>
            {
                Message = "Products fetched successfully",
                Success = true,
                Data = result
            });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var product = await _productService.GetByIdAsync(id);
            return Ok(new ApiResponse<Product> { Message = "Product fetched", Success = true, Data = product });
        }

        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, [FromBody] UpdateProductRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            await _productService.UpdateAsync(id, request);
            return Ok(new ApiResponse<object> { Message = "Product updated", Success = true });
        }

        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPatch("{id}")]
        public async Task<IActionResult> Patch(Guid id, [FromBody] UpdateProductRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            await _productService.PatchAsync(id, request);
            return Ok(new ApiResponse<object> { Message = "Product patched", Success = true });
        }

        [Authorize(Policy = "DELETE_PRODUCT")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(Guid id)
        {
            await _productService.DeleteAsync(id);
            return Ok(new ApiResponse<object> { Message = "Product deleted", Success = true });
        }

        // ---------------- STOCK MANAGEMENT ----------------
        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPut("{id}/stock")]
        public async Task<IActionResult> AdjustStock(Guid id, [FromBody] AdjustStockRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            // For stock adjustments, we MUST have a store context
            var effectiveStoreId = GetStoreIdContext(request.StoreId);
            if (!effectiveStoreId.HasValue) 
                return BadRequest(new ApiResponse<object> { Message = "StoreId is required for stock adjustment", Success = false });

            var userId = GetPerformingUserId();
            await _productService.AdjustStockAsync(id, effectiveStoreId.Value, request.Quantity, request.Operation, userId);

            return Ok(new ApiResponse<object> { Message = "Stock adjusted successfully", Success = true });
        }

        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPost("{id}/increase-stock")]
        public async Task<IActionResult> IncreaseStock(Guid id, [FromBody] IncreaseStockRequest request)
        {
            var userId = GetPerformingUserId();
            var product = await _productService.GetByIdAsync(id);
            // Default to the product's primary store if none specified
            await _productService.AdjustStockAsync(id, product.StoreId, request.Quantity, "INCREMENT", userId);
            return Ok(new ApiResponse<object> { Message = "Stock increased", Success = true });
        }

        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPost("inventory/update")]
        public async Task<IActionResult> UpdateInventory([FromBody] InventoryUpdateRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var userId = GetPerformingUserId();
            var userName = GetPerformingUserName();
            var result = await _productService.UpdateInventoryAsync(request, userId, userName);
            return Ok(new ApiResponse<object> { Success = true, Data = result });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("{id}/stock")]
        public async Task<IActionResult> GetProductStocks(Guid id)
        {
            var stocks = await _productService.GetProductStocksAsync(id);
            return Ok(new ApiResponse<IEnumerable<ProductStock>> { Success = true, Data = stocks });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("stock-summary")]
        public async Task<IActionResult> GetStockSummary([FromQuery] Guid? storeId = null)
        {
            var effectiveStoreId = GetStoreIdContext(storeId);
            var summary = await _productService.GetStockSummaryAsync(effectiveStoreId);
            return Ok(new ApiResponse<StockSummaryDto> { Success = true, Data = summary });
        }

        // ---------------- CATEGORY (GLOBAL) ----------------
        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var categories = await _productService.GetAllCategoriesAsync();
            return Ok(new ApiResponse<IEnumerable<Category>> { Success = true, Data = categories });
        }

        [Authorize(Policy = "CREATE_PRODUCT")]
        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var created = await _productService.CreateCategoryAsync(request);
            return Ok(new ApiResponse<Category> { Success = true, Data = created });
        }

        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var updated = await _productService.UpdateCategoryAsync(id, request);
            return Ok(new ApiResponse<Category?> { Success = true, Data = updated });
        }

        // ---------------- TAX CONFIG ----------------
        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("taxes")]
        public async Task<IActionResult> GetTaxes()
        {
            var taxes = await _productService.GetAllTaxesAsync();
            return Ok(new ApiResponse<IEnumerable<TaxConfiguration>> { Success = true, Data = taxes });
        }

        [Authorize(Policy = "UPDATE_PRODUCT")]
        [HttpPost("finalize-stock")]
        public async Task<IActionResult> FinalizeStock([FromBody] FinalizeStockRequest request)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            
            await _productService.FinalizeStockAsync(request);
            return Ok(new ApiResponse<object> { Message = "Inventory finalized successfully", Success = true });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("low-stock")]
        public async Task<IActionResult> GetLowStock([FromQuery] Guid? storeId = null, [FromQuery] int threshold = 10)
        {
            var effectiveStoreId = GetStoreIdContext(storeId);
            var result = await _productService.GetLowStockAsync(effectiveStoreId, threshold);
            return Ok(new ApiResponse<IEnumerable<Product>> { Success = true, Data = result });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("out-of-stock")]
        public async Task<IActionResult> GetOutOfStock([FromQuery] Guid? storeId = null)
        {
            var effectiveStoreId = GetStoreIdContext(storeId);
            var result = await _productService.GetOutOfStockAsync(effectiveStoreId);
            return Ok(new ApiResponse<IEnumerable<Product>> { Success = true, Data = result });
        }

        [Authorize(Policy = "VIEW_PRODUCT")]
        [HttpGet("top-selling")]
        public async Task<IActionResult> GetTopSelling([FromQuery] Guid? storeId = null, [FromQuery] int count = 10)
        {
            var effectiveStoreId = GetStoreIdContext(storeId);
            var result = await _productService.GetTopSellingAsync(effectiveStoreId, count);
            return Ok(new ApiResponse<IEnumerable<Product>> { Success = true, Data = result });
        }
    }

    public class AdjustStockRequest
    {
        public Guid? StoreId { get; set; }
        public int Quantity { get; set; }
        public string Operation { get; set; } = "INCREMENT"; // INCREMENT, DECREMENT, ADJUST
    }

    public class IncreaseStockRequest
    {
        public int Quantity { get; set; }
    }
}