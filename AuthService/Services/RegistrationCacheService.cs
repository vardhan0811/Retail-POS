using AuthService.DTOs;
using Microsoft.Extensions.Caching.Memory;

namespace AuthService.Services
{
    public class RegistrationCacheService
    {
        private readonly IMemoryCache _cache;
        public RegistrationCacheService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void StoreRegistration(string email, RegisterRequest request)
        {
            _cache.Set(email, request, TimeSpan.FromMinutes(10));
        }

        public RegisterRequest? GetRegistration(string email)
        {
            _cache.TryGetValue(email, out RegisterRequest? request);
            return request;
        }

        public void RemoveRegistration(string email)
        {
            _cache.Remove(email);
        }
    }
}
