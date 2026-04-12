using Microsoft.Extensions.Caching.Memory;

namespace AuthService.Services
{
    public class PasswordResetState
    {
        public bool Pending { get; set; }
        public int FailedAttempts { get; set; }
    }

    public class PasswordResetCacheService
    {
        private readonly IMemoryCache _cache;
        private static string Key(string email) => $"pwd-reset:{email}";
        private static readonly TimeSpan Window = TimeSpan.FromMinutes(10);

        public PasswordResetCacheService(IMemoryCache cache)
        {
            _cache = cache;
        }

        public void SetPending(string email)
        {
            _cache.Set(Key(email), new PasswordResetState
            {
                Pending = true,
                FailedAttempts = 0
            }, Window);
        }

        public bool IsPending(string email)
        {
            return _cache.TryGetValue(Key(email), out PasswordResetState? state) && state?.Pending == true;
        }

        public bool CanAttempt(string email, int maxAttempts)
        {
            if (!_cache.TryGetValue(Key(email), out PasswordResetState? state) || state == null)
                return false;

            return state.FailedAttempts < maxAttempts;
        }

        public int IncrementFailedAttempt(string email)
        {
            if (!_cache.TryGetValue(Key(email), out PasswordResetState? state) || state == null)
                return int.MaxValue;

            state.FailedAttempts++;
            _cache.Set(Key(email), state, Window);
            return state.FailedAttempts;
        }

        public void Clear(string email)
        {
            _cache.Remove(Key(email));
        }
    }
}
