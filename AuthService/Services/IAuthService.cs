using AuthService.DTOs;
using System.Threading.Tasks;

namespace AuthService.Services
{
    public interface IAuthService
    {
        Task RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request);
        Task<AuthResponse?> RefreshAsync(string refreshToken);
        Task VerifyOtpAsync(string email, string otp);
        Task ForgotPasswordAsync(string email);
        Task ResetPasswordAsync(string email, string otp, string newPassword, string confirmPassword);
        Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword);
        Task LogoutAsync(Guid userId);
        Task<UserIdentityViewDto> UpdateUserRoleAsync(Guid userId, string role);
        Task<UserIdentityViewDto> UpdateUserStatusAsync(Guid userId, bool isActive);
        Task<IReadOnlyList<string>> GetRolesAsync();
        Task<IReadOnlyList<string>> GetPermissionsAsync();
    }
}
