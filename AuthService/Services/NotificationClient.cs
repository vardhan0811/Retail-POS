using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using AuthService.DTOs;
using AuthService.Middleware;
using System.Net;

namespace AuthService.Services
{
    public class NotificationClient
    {
        private readonly HttpClient _httpClient;
        public NotificationClient(HttpClient httpClient)
        {
            _httpClient = httpClient;
        }

        public async Task<bool> SendOtpAsync(string email)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/api/otp/send", new SendOtpRequest { Email = email });
                if (!response.IsSuccessStatusCode)
                    throw new BusinessException("Failed to communicate with OTP service");

                return true;
            }
            catch (HttpRequestException)
            {
                throw new BusinessException("Failed to communicate with OTP service");
            }
            catch (TaskCanceledException)
            {
                throw new BusinessException("OTP service timeout. Please try again.");
            }
        }

        public async Task<bool> VerifyOtpAsync(string email, string otp)
        {
            try
            {
                var response = await _httpClient.PostAsJsonAsync("/api/otp/verify", new VerifyOtpRequest { Email = email, Otp = otp });

                if (response.IsSuccessStatusCode)
                    return true;

                if (response.StatusCode == HttpStatusCode.BadRequest)
                    return false;

                throw new BusinessException("Failed to communicate with OTP service");
            }
            catch (HttpRequestException)
            {
                throw new BusinessException("Failed to communicate with OTP service");
            }
            catch (TaskCanceledException)
            {
                throw new BusinessException("OTP service timeout. Please try again.");
            }
        }
    }
}
