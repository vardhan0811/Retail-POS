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

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            var client = CreateClientWithAuth();
            var response = await client.GetAsync($"{ProductBaseUrl()}/api/products/categories");

            if (!response.IsSuccessStatusCode)
                return StatusCode((int)response.StatusCode, new ApiResponse<object> { Success = false, Message = "Failed to fetch categories", Data = null });

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<CategoryViewDto>>>();
            return Ok(new ApiResponse<IReadOnlyList<CategoryViewDto>>
            {
                Success = true,
                Message = "Categories fetched successfully",
                Data = payload?.Data ?? Array.Empty<CategoryViewDto>()
            });
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
            return Ok(new ApiResponse<CategoryViewDto?>
            {
                Success = true,
                Message = "Category fetched successfully",
                Data = payload?.Data
            });
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
            return Ok(new ApiResponse<CategoryViewDto?>
            {
                Success = true,
                Message = "Category created successfully",
                Data = payload?.Data
            });
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
            return Ok(new ApiResponse<CategoryViewDto?>
            {
                Success = true,
                Message = "Category updated successfully",
                Data = payload?.Data
            });
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
            return Ok(new ApiResponse<IReadOnlyList<TaxViewDto>>
            {
                Success = true,
                Message = "Taxes fetched successfully",
                Data = payload?.Data ?? Array.Empty<TaxViewDto>()
            });
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
            return Ok(new ApiResponse<TaxViewDto?>
            {
                Success = true,
                Message = "Tax fetched successfully",
                Data = payload?.Data
            });
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
            return Ok(new ApiResponse<TaxViewDto?>
            {
                Success = true,
                Message = "Tax created successfully",
                Data = payload?.Data
            });
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
            return Ok(new ApiResponse<TaxViewDto?>
            {
                Success = true,
                Message = "Tax updated successfully",
                Data = payload?.Data
            });
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
