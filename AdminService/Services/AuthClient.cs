using AdminService.DTOs;
using AdminService.Middleware;
using Shared.Contracts.Models;
using Microsoft.AspNetCore.Http;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.Logging;

namespace AdminService.Services
{
    public class AuthClient
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<AuthClient> _logger;

        public AuthClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor, ILogger<AuthClient> logger)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }

        public async Task<UserDto> UpdateUserRoleAsync(Guid userId, string role)
        {
            var payloadObj = new { Role = role }; // PascalCase to match AuthService DTO
            _logger.LogInformation("[AuthClient] Calling AuthService Role Update. User: {UserId}, Payload: {@Payload}", userId, payloadObj);

            using var response = await SendWithAuthAsync(HttpMethod.Put, $"api/auth/users/{userId}/role", payloadObj);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                string message = "Failed to update user role in AuthService";
                try 
                {
                    var errorPayload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    message = errorPayload?.Message ?? message;
                }
                catch (System.Text.Json.JsonException)
                {
                    _logger.LogWarning("[AuthClient] Could not parse error response as JSON: {ResponseBody}", responseBody);
                    message = $"AuthService Error ({response.StatusCode}): {responseBody}";
                }
                
                _logger.LogError("[AuthClient] Role update failed: {Message}", message);
                throw new BusinessException(message);
            }

            var payload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<UserDto>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<UserDto> UpdateUserStatusAsync(Guid userId, UserStatus status)
        {
            var payloadObj = new { Status = status }; // PascalCase to match AuthService DTO
            _logger.LogInformation("[AuthClient] Calling AuthService Status Update. User: {UserId}, Payload: {@Payload}", userId, payloadObj);

            using var response = await SendWithAuthAsync(HttpMethod.Put, $"api/auth/users/{userId}/status", payloadObj);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                string message = "Failed to update user status in AuthService";
                try 
                {
                    var errorPayload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    message = errorPayload?.Message ?? message;
                }
                catch (System.Text.Json.JsonException)
                {
                    _logger.LogWarning("[AuthClient] Could not parse error response as JSON: {ResponseBody}", responseBody);
                    message = $"AuthService Error ({response.StatusCode}): {responseBody}";
                }

                _logger.LogError("[AuthClient] Status update failed: {Message}", message);
                throw new BusinessException(message);
            }

            var payload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<UserDto>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<UserDto> UpdateUserStoreAsync(Guid userId, Guid? storeId)
        {
            var payloadObj = new { StoreId = storeId }; // PascalCase to match AuthService DTO
            _logger.LogInformation("[AuthClient] Calling AuthService Store Update. User: {UserId}, Payload: {@Payload}", userId, payloadObj);

            using var response = await SendWithAuthAsync(HttpMethod.Put, $"api/auth/users/{userId}/store", payloadObj);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                string message = "Failed to update user store in AuthService";
                try 
                {
                    var errorPayload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    message = errorPayload?.Message ?? message;
                }
                catch (System.Text.Json.JsonException)
                {
                    _logger.LogWarning("[AuthClient] Could not parse error response as JSON: {ResponseBody}", responseBody);
                    message = $"AuthService Error ({response.StatusCode}): {responseBody}";
                }

                _logger.LogError("[AuthClient] Store update failed: {Message}", message);
                throw new BusinessException(message);
            }

            var payload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<UserDto>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<UserDto> ApproveUserAsync(Guid userId)
        {
            _logger.LogInformation("[AuthClient] Calling AuthService User Approval. User: {UserId}", userId);

            using var response = await SendWithAuthAsync(HttpMethod.Post, $"api/auth/users/{userId}/approve");
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                string message = "Failed to approve user in AuthService";
                try 
                {
                    var errorPayload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    message = errorPayload?.Message ?? message;
                }
                catch (System.Text.Json.JsonException)
                {
                    _logger.LogWarning("[AuthClient] Could not parse error response as JSON: {ResponseBody}", responseBody);
                    message = $"AuthService Error ({response.StatusCode}): {responseBody}";
                }
                throw new BusinessException(message);
            }

            var payload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<UserDto>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<UserDto> RejectUserAsync(Guid userId, string reason)
        {
            _logger.LogInformation("[AuthClient] Calling AuthService User Rejection. User: {UserId}, Reason: {Reason}", userId, reason);

            var payloadObj = new { Reason = reason };
            using var response = await SendWithAuthAsync(HttpMethod.Post, $"api/auth/users/{userId}/reject", payloadObj);
            var responseBody = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                string message = "Failed to reject user in AuthService";
                try 
                {
                    var errorPayload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<object>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    message = errorPayload?.Message ?? message;
                }
                catch (System.Text.Json.JsonException)
                {
                    _logger.LogWarning("[AuthClient] Could not parse error response as JSON: {ResponseBody}", responseBody);
                    message = $"AuthService Error ({response.StatusCode}): {responseBody}";
                }
                throw new BusinessException(message);
            }

            var payload = System.Text.Json.JsonSerializer.Deserialize<ApiResponse<UserDto>>(responseBody, new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<IReadOnlyList<string>> GetRolesAsync()
        {
            using var response = await SendWithAuthAsync(HttpMethod.Get, "api/auth/roles");
            if (!response.IsSuccessStatusCode)
                throw new BusinessException("Failed to fetch roles from AuthService");

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<string>>>();
            return payload?.Data ?? Array.Empty<string>();
        }

        public async Task<IReadOnlyList<string>> GetPermissionsAsync()
        {
            using var response = await SendWithAuthAsync(HttpMethod.Get, "api/auth/permissions");
            if (!response.IsSuccessStatusCode)
                throw new BusinessException("Failed to fetch permissions from AuthService");

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<string>>>();
            return payload?.Data ?? Array.Empty<string>();
        }

        private async Task<HttpResponseMessage> SendWithAuthAsync(HttpMethod method, string url, object? payload = null)
        {
            var request = new HttpRequestMessage(method, url);
            
            var authHeader = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
            if (!string.IsNullOrEmpty(authHeader))
            {
                if (authHeader.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase))
                {
                    var token = authHeader.Substring("Bearer ".Length).Trim();
                    request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
                }
                else
                {
                    request.Headers.Add("Authorization", authHeader);
                }
            }

            if (payload != null)
            {
                request.Content = JsonContent.Create(payload);
            }

            return await _httpClient.SendAsync(request);
        }
    }
}
