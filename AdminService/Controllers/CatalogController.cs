using AdminService.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace AdminService.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class CatalogController : ControllerBase
    {
        private readonly IHttpClientFactory _httpClientFactory;
        private readonly IConfiguration _config;
        private readonly ILogger<CatalogController> _logger;

        public CatalogController(IHttpClientFactory httpClientFactory, IConfiguration config, ILogger<CatalogController> logger)
        {
            _httpClientFactory = httpClientFactory;
            _config = config;
            _logger = logger;
        }

        private HttpClient CreateClientWithAuth()
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(5);

            var authHeader = Request.Headers.Authorization.ToString();
            if (!string.IsNullOrWhiteSpace(authHeader) && authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
            {
                var token = authHeader.Substring("Bearer ".Length).Trim();
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            }

            return client;
        }

        private string ProductBaseUrl()
        {
            var productServiceBaseUrl = _config["ServiceUrls:ProductService"];
            if (string.IsNullOrWhiteSpace(productServiceBaseUrl))
                throw new InvalidOperationException("ServiceUrls:ProductService is not configured");

            return productServiceBaseUrl.TrimEnd('/');
        }

        // ---------------- PRODUCTS ----------------

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("products")]
        public async Task<IActionResult> GetProducts(
            [FromQuery] Guid? storeId = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 20,
            [FromQuery] string? search = null,
            [FromQuery] Guid? categoryId = null,
            [FromQuery] string? sortBy = null)
        {
            var client = CreateClientWithAuth();
            var url = $"{ProductBaseUrl()}/api/products?page={page}&pageSize={pageSize}";
            if (storeId.HasValue) url += $"&storeId={storeId}";
            if (!string.IsNullOrEmpty(search)) url += $"&search={Uri.EscapeDataString(search)}";
            if (categoryId.HasValue) url += $"&categoryId={categoryId}";
            if (!string.IsNullOrEmpty(sortBy)) url += $"&sortBy={sortBy}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to fetch products" });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<PagedResult<ProductViewDto>>>();
            return Ok(payload);
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("products/{id}")]
        public async Task<IActionResult> GetProductById(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/{id}");
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<ProductViewDto>>());
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPost("products")]
        public async Task<IActionResult> CreateProduct([FromBody] object request) // Proxy objects
        {
            var client = CreateClientWithAuth();
            var response = await client.PostAsJsonAsync($"{ProductBaseUrl()}/api/products", request);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<ProductViewDto>>());
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPut("products/{id}")]
        public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] object request)
        {
            var client = CreateClientWithAuth();
            var response = await client.PutAsJsonAsync($"{ProductBaseUrl()}/api/products/{id}", request);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<object>>());
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPatch("products/{id}")]
        public async Task<IActionResult> PatchProduct(Guid id, [FromBody] object request)
        {
            var client = CreateClientWithAuth();
            var response = await client.PatchAsJsonAsync($"{ProductBaseUrl()}/api/products/{id}", request);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<object>>());
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpDelete("products/{id}")]
        public async Task<IActionResult> DeleteProduct(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.DeleteAsync($"{ProductBaseUrl()}/api/products/{id}");
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<object>>());
        }

        [Authorize(Policy = "MANAGE_CATALOG")] // Or specific stock policy
        [HttpPut("products/{id}/stock")]
        public async Task<IActionResult> AdjustStock(Guid id, [FromBody] object request)
        {
            var client = CreateClientWithAuth();
            var response = await client.PutAsJsonAsync($"{ProductBaseUrl()}/api/products/{id}/stock", request);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<object>>());
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("products/{id}/stock")]
        public async Task<IActionResult> GetProductStock(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/{id}/stock");
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<List<object>>>());
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("stock-summary")]
        public async Task<IActionResult> GetStockSummary([FromQuery] Guid? storeId = null)
        {
            var client = CreateClientWithAuth();
            var url = $"{ProductBaseUrl()}/api/products/stock-summary";
            if (storeId.HasValue) url += $"?storeId={storeId}";

            var response = await client.GetAsync(url);
            if (!response.IsSuccessStatusCode) return StatusCode((int)response.StatusCode);
            return Ok(await response.Content.ReadFromJsonAsync<ApiResponse<StockSummaryDto>>());
        }

        // ---------------- CATEGORIES ----------------

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/categories");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to fetch categories", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<CategoryViewDto>>>();
            return Ok(payload);
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("categories/{id}")]
        public async Task<IActionResult> GetCategoryById(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/categories/{id}");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to fetch category", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<CategoryViewDto>>();
            return Ok(payload);
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] CreateCategoryAdminRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            var client = CreateClientWithAuth();
            var response = await client.PostAsJsonAsync($"{ProductBaseUrl()}/api/products/categories", new { request.Name });

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to create category", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<CategoryViewDto>>();
            return Ok(payload);
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPut("categories/{id}")]
        public async Task<IActionResult> UpdateCategory(Guid id, [FromBody] UpdateCategoryAdminRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            var client = CreateClientWithAuth();
            var response = await client.PutAsJsonAsync($"{ProductBaseUrl()}/api/products/categories/{id}", new { request.Name });

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to update category", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<CategoryViewDto>>();
            return Ok(payload);
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpDelete("categories/{id}")]
        public async Task<IActionResult> DeleteCategory(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.DeleteAsync($"{ProductBaseUrl()}/api/products/categories/{id}");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to delete category", Data = null });

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Category deleted successfully",
                Data = null
            });
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("taxes")]
        public async Task<IActionResult> GetTaxes()
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/taxes");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to fetch taxes", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<TaxViewDto>>>();
            return Ok(payload);
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("taxes/{id}")]
        public async Task<IActionResult> GetTaxById(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/taxes/{id}");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to fetch tax", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<TaxViewDto>>();
            return Ok(payload);
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPost("taxes")]
        public async Task<IActionResult> CreateTax([FromBody] CreateTaxAdminRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            var client = CreateClientWithAuth();
            var response = await client.PostAsJsonAsync($"{ProductBaseUrl()}/api/products/taxes", new { request.Name, request.Percentage });

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to create tax", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<TaxViewDto>>();
            return Ok(payload);
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpPut("taxes/{id}")]
        public async Task<IActionResult> UpdateTax(Guid id, [FromBody] UpdateTaxAdminRequest request)
        {
            if (!ModelState.IsValid)
                return BadRequest(new ApiResponse<object> { Success = false, Message = "Invalid request", Data = ModelState });

            var client = CreateClientWithAuth();
            var response = await client.PutAsJsonAsync($"{ProductBaseUrl()}/api/products/taxes/{id}", new { request.Name, request.Percentage });

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to update tax", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<TaxViewDto>>();
            return Ok(payload);
        }

        [Authorize(Policy = "MANAGE_CATALOG")]
        [HttpDelete("taxes/{id}")]
        public async Task<IActionResult> DeleteTax(Guid id)
        {
            var client = CreateClientWithAuth();
            var response = await client.DeleteAsync($"{ProductBaseUrl()}/api/products/taxes/{id}");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to delete tax", Data = null });

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Tax deleted successfully",
                Data = null
            });
        }
    }
}
