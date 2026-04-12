using Microsoft.Extensions.Caching.Memory;
using System;
using System.Security.Cryptography;

namespace AuthService.Services
{
    public class RefreshTokenService
    {
        private readonly IMemoryCache _cache;
        private readonly TimeSpan _refreshTokenLifetime = TimeSpan.FromDays(7);
        private static string UserKey(Guid userId) => $"refresh:user:{userId}";
        private static string TokenKey(string token) => $"refresh:token:{token}";

        public RefreshTokenService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public string GenerateRefreshToken(Guid userId)
        {
            Span<byte> randomBytes = stackalloc byte[64];
            RandomNumberGenerator.Fill(randomBytes);
            var token = Convert.ToBase64String(randomBytes);

            if (_cache.TryGetValue(UserKey(userId), out string? previousToken) && !string.IsNullOrWhiteSpace(previousToken))
            {
                _cache.Remove(TokenKey(previousToken));
            }

            _cache.Set(UserKey(userId), token, _refreshTokenLifetime);
            _cache.Set(TokenKey(token), userId, _refreshTokenLifetime);
            return token;
        }

        public Guid? GetUserIdFromToken(string token)
        {
            if (_cache.TryGetValue(TokenKey(token), out Guid userId))
                return userId;

            return null;
        }

        public void RevokeByToken(string token)
        {
            if (string.IsNullOrWhiteSpace(token))
                return;

            if (_cache.TryGetValue(TokenKey(token), out Guid userId))
            {
                _cache.Remove(TokenKey(token));
                _cache.Remove(UserKey(userId));
            }
        }

        public void RemoveRefreshToken(Guid userId)
        {
            if (_cache.TryGetValue(UserKey(userId), out string? token) && !string.IsNullOrWhiteSpace(token))
            {
                _cache.Remove(TokenKey(token));
            }

            _cache.Remove(UserKey(userId));
        }

        public void RevokeAllForUser(Guid userId)
        {
            RemoveRefreshToken(userId);
        }
    }
}
