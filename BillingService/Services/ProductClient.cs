using System.Net.Http.Json;
using BillingService.DTOs;
using Microsoft.AspNetCore.Http;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Net.Http.Headers;
using BillingService.Middleware;

namespace BillingService.Services
{
    public class ProductClient : IProductClient
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private static readonly TimeSpan DefaultTimeout = TimeSpan.FromSeconds(5);
        private const int MaxAttempts = 3;

        public ProductClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<ProductDto> GetProductById(Guid productId)
        {
            return await RetryAsync(async ct =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"api/products/{productId}");
                AttachAuthorization(request);

                using var httpResponse = await _httpClient.SendAsync(request, ct);
                if (httpResponse.StatusCode == HttpStatusCode.NotFound)
                    throw new NotFoundException($"Product with id {productId} not found");
                if (httpResponse.StatusCode == HttpStatusCode.Forbidden)
                    throw new ForbiddenException("Not allowed to access product details");

                httpResponse.EnsureSuccessStatusCode();

                var response = await httpResponse.Content.ReadFromJsonAsync<ApiResponse<ProductDto>>(cancellationToken: ct);
                if (response?.Data == null)
                    throw new NotFoundException($"Product with id {productId} not found");

                return response.Data;
            });
        }

        public async Task IncreaseStockAsync(Guid productId, int quantity)
        {
            await RetryAsync(async ct =>
            {
                using var request = new HttpRequestMessage(HttpMethod.Post, $"api/products/{productId}/increase-stock")
                {
                    Content = JsonContent.Create(new { quantity })
                };
                AttachAuthorization(request);

                using var response = await _httpClient.SendAsync(request, ct);
                if (response.StatusCode == HttpStatusCode.Forbidden)
                    throw new ForbiddenException("Not allowed to update product stock");
                response.EnsureSuccessStatusCode();
                return true;
            });
        }

        public async Task FinalizeStockAsync(Guid storeId, List<(Guid ProductId, int Quantity)> items)
        {
            await RetryAsync(async ct =>
            {
                var body = new
                {
                    storeId,
                    items = items.Select(i => new { productId = i.ProductId, quantity = i.Quantity }).ToList()
                };

                using var request = new HttpRequestMessage(HttpMethod.Post, "api/products/finalize-stock")
                {
                    Content = JsonContent.Create(body)
                };
                AttachAuthorization(request);

                using var response = await _httpClient.SendAsync(request, ct);
                if (response.StatusCode == HttpStatusCode.Forbidden)
                    throw new ForbiddenException("Not allowed to finalize stock");
                
                response.EnsureSuccessStatusCode();
                return true;
            });
        }

        private void AttachAuthorization(HttpRequestMessage request)
        {
            var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
            if (string.IsNullOrWhiteSpace(token))
                return;

            if (AuthenticationHeaderValue.TryParse(token, out var authHeader))
            {
                request.Headers.Authorization = authHeader;
            }
        }

        private async Task<T> RetryAsync<T>(Func<CancellationToken, Task<T>> action)
        {
            Exception? lastException = null;

            for (var attempt = 1; attempt <= MaxAttempts; attempt++)
            {
                using var cts = new CancellationTokenSource(DefaultTimeout);

                try
                {
                    return await action(cts.Token);
                }
                catch (NotFoundException)
                {
                    throw;
                }
                catch (ForbiddenException)
                {
                    throw;
                }
                catch (TaskCanceledException ex)
                {
                    lastException = ex;
                }
                catch (HttpRequestException ex)
                {
                    lastException = ex;
                }

                if (attempt < MaxAttempts)
                    await Task.Delay(TimeSpan.FromMilliseconds(200 * attempt));
            }

            throw new ServiceUnavailableException(
                $"ProductService is unavailable. Please try again. Details: {lastException?.Message}");
        }

    }
}
