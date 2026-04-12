using AdminService.DTOs;
using AdminService.Middleware;
using Microsoft.AspNetCore.Http;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;

namespace AdminService.Services
{
    public class AuthClient
    {
        private readonly HttpClient _httpClient;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public AuthClient(HttpClient httpClient, IHttpContextAccessor httpContextAccessor)
        {
            _httpClient = httpClient;
            _httpContextAccessor = httpContextAccessor;
        }

        public async Task<UserDto> UpdateUserRoleAsync(Guid userId, string role)
        {
            using var request = new HttpRequestMessage(HttpMethod.Put, $"/api/auth/users/{userId}/role")
            {
                Content = JsonContent.Create(new { role })
            };
            AttachAuthorization(request);

            using var response = await _httpClient.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.NotFound)
                throw new NotFoundException("User or role not found");
            if (!response.IsSuccessStatusCode)
                throw new BusinessException("Failed to update user role in AuthService");

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<UserDto>>();
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<UserDto> UpdateUserStatusAsync(Guid userId, bool isActive)
        {
            using var request = new HttpRequestMessage(HttpMethod.Put, $"/api/auth/users/{userId}/status")
            {
                Content = JsonContent.Create(new { isActive })
            };
            AttachAuthorization(request);

            using var response = await _httpClient.SendAsync(request);
            if (response.StatusCode == HttpStatusCode.NotFound)
                throw new NotFoundException("User not found");
            if (!response.IsSuccessStatusCode)
                throw new BusinessException("Failed to update user status in AuthService");

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<UserDto>>();
            return payload?.Data ?? throw new BusinessException("Invalid response from AuthService");
        }

        public async Task<IReadOnlyList<string>> GetRolesAsync()
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/roles");
            AttachAuthorization(request);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                throw new BusinessException("Failed to fetch roles from AuthService");

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<string>>>();
            return payload?.Data ?? Array.Empty<string>();
        }

        public async Task<IReadOnlyList<string>> GetPermissionsAsync()
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, "/api/auth/permissions");
            AttachAuthorization(request);

            using var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
                throw new BusinessException("Failed to fetch permissions from AuthService");

            var payload = await response.Content.ReadFromJsonAsync<ApiResponse<IReadOnlyList<string>>>();
            return payload?.Data ?? Array.Empty<string>();
        }

        private void AttachAuthorization(HttpRequestMessage request)
        {
            var token = _httpContextAccessor.HttpContext?.Request.Headers["Authorization"].ToString();
            if (string.IsNullOrWhiteSpace(token))
                return;

            if (AuthenticationHeaderValue.TryParse(token, out var authHeader))
                request.Headers.Authorization = authHeader;
        }
    }
}
