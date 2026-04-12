using System;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using BillingService.DTOs;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace BillingService.Services
{
    public class UserClient : IUserClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<UserClient> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public UserClient(HttpClient httpClient, ILogger<UserClient> logger, IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<bool> UserExistsAsync(Guid userId)
        {
            try
            {
                var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrWhiteSpace(token))
                {
                    _httpClient.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Replace("Bearer ", ""));
                }

                var response = await _httpClient.GetAsync($"api/admin/users/{userId}");
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return false;

                response.EnsureSuccessStatusCode();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking user existence for {UserId}", userId);
                throw;
            }
        }
    }

    public class StoreClient : IStoreClient
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<StoreClient> _logger;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public StoreClient(HttpClient httpClient, ILogger<StoreClient> logger, IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<bool> StoreExistsAsync(Guid storeId)
        {
            try
            {
                var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
                if (!string.IsNullOrWhiteSpace(token))
                {
                    _httpClient.DefaultRequestHeaders.Authorization =
                        new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token.Replace("Bearer ", ""));
                }

                var response = await _httpClient.GetAsync($"api/admin/stores/{storeId}");
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    return false;

                response.EnsureSuccessStatusCode();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking store existence for {StoreId}", storeId);
                throw;
            }
        }
    }
}
