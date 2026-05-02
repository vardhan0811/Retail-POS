using AuthService.DTOs;
using Shared.Contracts.Models;
using System.Threading.Tasks;

namespace AuthService.Services
{
    public interface IAuthService
    {
        Task RegisterAsync(RegisterRequest request);
        Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress);
        Task<AuthResponse> GoogleLoginAsync(string idToken, string? ipAddress);
        Task<AuthResponse?> RefreshAsync(string refreshToken, string? ipAddress);
        Task VerifyOtpAsync(string email, string otp);
        Task ForgotPasswordAsync(string email);
        Task ResetPasswordAsync(string email, string otp, string newPassword, string confirmPassword);
        Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress);
        Task LogoutAsync(Guid userId, Guid sessionId);
        Task LogoutAllSessionsAsync(Guid userId);
        Task<UserProfileDto> GetUserProfileAsync(Guid userId);
        Task<SessionInfoDto?> GetActiveSessionAsync(Guid userId, Guid sessionId);
        Task<List<AuthAuditLogDto>> GetLoginHistoryAsync(Guid userId, int count = 10);
        Task<UserIdentityViewDto> UpdateUserRoleAsync(Guid userId, string role, Guid callerId);
        Task<UserIdentityViewDto> UpdateUserStoreAsync(Guid userId, Guid? storeId);
        Task<UserIdentityViewDto> UpdateUserStatusAsync(Guid userId, UserStatus status);
        Task<UserIdentityViewDto> ApproveUserAsync(Guid userId, string adminEmail);
        Task<UserIdentityViewDto> RejectUserAsync(Guid userId, string adminEmail, string reason);
        Task<AuthResponse> StartSessionAsync(Guid userId, Guid? terminalId, Guid storeId, string? ipAddress);
        Task<IReadOnlyList<string>> GetRolesAsync();
        Task<IReadOnlyList<string>> GetPermissionsAsync();
        Task<int> GetActiveStaffCountAsync();
    }
}
