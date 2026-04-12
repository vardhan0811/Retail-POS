using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using NotificationService.Data;
using NotificationService.Entities;
using NotificationService.Middleware;
using System.Net;
using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;

namespace NotificationService.Services
{
    public class EmailSettings
    {
        public string FromEmail { get; set; } = string.Empty;
        public string AppPassword { get; set; } = string.Empty;
        public string SmtpHost { get; set; } = "smtp.gmail.com";
        public int SmtpPort { get; set; } = 587;
    }

    public class OtpSecuritySettings
    {
        public string HashKey { get; set; } = string.Empty;
    }

    public class OtpService
    {
        private readonly NotificationDbContext _context;
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<OtpService> _logger;
        private readonly byte[] _otpHashKey;

        public OtpService(
            NotificationDbContext context,
            IOptions<EmailSettings> emailOptions,
            IOptions<OtpSecuritySettings> otpSecurityOptions,
            ILogger<OtpService> logger)
        {
            _context = context;
            _emailSettings = emailOptions.Value;
            _logger = logger;

            var hashKey = otpSecurityOptions.Value.HashKey;
            if (string.IsNullOrWhiteSpace(hashKey))
                throw new InvalidOperationException("Missing config: OtpSettings:HashKey");

            _otpHashKey = Encoding.UTF8.GetBytes(hashKey);
        }

        public async Task GenerateOtpAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            var otp = RandomNumberGenerator.GetInt32(100000, 999999).ToString();

            var latest = await _context.Otps
                .Where(x => x.Email == normalizedEmail)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (latest != null && !latest.IsUsed && latest.ExpiryTime > DateTime.UtcNow && latest.CreatedAt > DateTime.UtcNow.AddSeconds(-30))
                throw new BusinessException("Please wait before requesting another OTP");

            var entity = new Otp
            {
                Id = Guid.NewGuid(),
                Email = normalizedEmail,
                CodeHash = Convert.ToBase64String(ComputeOtpHash(normalizedEmail, otp)),
                ExpiryTime = DateTime.UtcNow.AddMinutes(5),
                IsUsed = false,
                CreatedAt = DateTime.UtcNow
            };

            _context.Otps.Add(entity);
            await _context.SaveChangesAsync();

            try
            {
                await SendOtpEmailAsync(normalizedEmail, otp);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send OTP email for {Email}", normalizedEmail);
                _context.Otps.Remove(entity);
                await _context.SaveChangesAsync();
                throw new BusinessException("Failed to deliver OTP. Please try again.");
            }
        }

        public async Task<bool> VerifyOtpAsync(string email, string otp)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();

            var latest = await _context.Otps
                .Where(x => x.Email == normalizedEmail)
                .OrderByDescending(x => x.CreatedAt)
                .FirstOrDefaultAsync();

            if (latest == null)
                return false;

            if (latest.IsUsed)
                return false;

            if (latest.ExpiryTime < DateTime.UtcNow)
                return false;

            if (!TryDecodeBase64(latest.CodeHash, out var storedBytes))
                return false;

            var incomingBytes = ComputeOtpHash(normalizedEmail, otp);
            if (!CryptographicOperations.FixedTimeEquals(storedBytes, incomingBytes))
                return false;

            latest.IsUsed = true;
            await _context.SaveChangesAsync();

            return true;
        }

        private async Task SendOtpEmailAsync(string email, string otp)
        {
            var smtpClient = new SmtpClient(_emailSettings.SmtpHost)
            {
                Port = _emailSettings.SmtpPort,
                Credentials = new NetworkCredential(_emailSettings.FromEmail, _emailSettings.AppPassword),
                EnableSsl = true,
            };

            var mail = new MailMessage(_emailSettings.FromEmail, email)
            {
                Subject = "Your OTP Code",
                Body = $"Your OTP code is: {otp}",
            };

            await smtpClient.SendMailAsync(mail);
        }

        private byte[] ComputeOtpHash(string normalizedEmail, string otp)
        {
            using var hmac = new HMACSHA256(_otpHashKey);
            var payload = Encoding.UTF8.GetBytes($"{normalizedEmail}:{otp}");
            return hmac.ComputeHash(payload);
        }

        private static bool TryDecodeBase64(string value, out byte[] bytes)
        {
            try
            {
                bytes = Convert.FromBase64String(value);
                return true;
            }
            catch
            {
                bytes = Array.Empty<byte>();
                return false;
            }
        }
    }
}
