using AuthService.DTOs;
using AuthService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using Microsoft.Extensions.Logging;
using AuthService.Middleware;

namespace AuthService.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly RefreshTokenService _refreshTokenService;
        private readonly ILogger<AuthController> _logger;
        private readonly IWebHostEnvironment _environment;

        public AuthController(IAuthService authService, RefreshTokenService refreshTokenService, ILogger<AuthController> logger, IWebHostEnvironment environment)
        {
            _authService = authService;
            _refreshTokenService = refreshTokenService;
            _logger = logger;
            _environment = environment;
        }

        [Authorize]
        [HttpGet("me")]
        public IActionResult GetMe()
        {
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var storeId = User.FindFirst("storeId")?.Value;
            var permissions = User.FindAll("permission").Select(p => p.Value).ToList();

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "User info fetched successfully",
                Data = new { UserId = userId, Email = email, Role = role, StoreId = storeId, Permissions = permissions }
            });
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            await _authService.RegisterAsync(request);
            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "OTP Sent Successfully",
                Data = null
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpPut("users/{id}/role")]
        public async Task<IActionResult> UpdateUserRole(Guid id, [FromBody] UpdateUserRoleAdminRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            var updated = await _authService.UpdateUserRoleAsync(id, request.Role);
            return Ok(new ApiResponse<UserIdentityViewDto>
            {
                Success = true,
                Message = "User role updated successfully",
                Data = updated
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpPut("users/{id}/status")]
        public async Task<IActionResult> UpdateUserStatus(Guid id, [FromBody] UpdateUserStatusAdminRequest request)
        {
            var updated = await _authService.UpdateUserStatusAsync(id, request.IsActive);
            return Ok(new ApiResponse<UserIdentityViewDto>
            {
                Success = true,
                Message = "User status updated successfully",
                Data = updated
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _authService.GetRolesAsync();
            return Ok(new ApiResponse<IReadOnlyList<string>>
            {
                Success = true,
                Message = "Roles fetched successfully",
                Data = roles
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpGet("permissions")]
        public async Task<IActionResult> GetPermissions()
        {
            var permissions = await _authService.GetPermissionsAsync();
            return Ok(new ApiResponse<IReadOnlyList<string>>
            {
                Success = true,
                Message = "Permissions fetched successfully",
                Data = permissions
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            AuthResponse response;
            try
            {
                response = await _authService.LoginAsync(request);
            }
            catch (BusinessException ex) when (string.Equals(ex.Message, "Invalid credentials", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogWarning("Login failed for {Email}", request.Email?.Trim().ToLowerInvariant());
                throw;
            }

            var refreshToken = _refreshTokenService.GenerateRefreshToken(response.UserId);
            response.RefreshToken = refreshToken;
            Response.Cookies.Append("refreshToken", refreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            _logger.LogInformation("Login successful for UserId={UserId}", response.UserId);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Login successful",
                Data = new
                {
                    response.Token,
                    response.RefreshToken,
                    response.Email
                }
            });
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh()
        {
            if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken))
                return Unauthorized(new ApiResponse<string> { Success = false, Message = "No refresh token", Data = null });

            var authResponse = await _authService.RefreshAsync(refreshToken);
            if (authResponse == null)
                return Unauthorized(new ApiResponse<string> { Success = false, Message = "Invalid refresh token", Data = null });

            Response.Cookies.Append("refreshToken", authResponse.RefreshToken, new CookieOptions
            {
                HttpOnly = true,
                Secure = !_environment.IsDevelopment(),
                SameSite = SameSiteMode.Lax,
                Expires = DateTimeOffset.UtcNow.AddDays(7)
            });

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Token refreshed",
                Data = authResponse
            });
        }

        [HttpPost("verify-otp")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyOtpRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            await _authService.VerifyOtpAsync(request.Email, request.Otp);
            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "OTP verified successfully, Account Created.",
                Data = null
            });
        }

        [HttpPost("forgot-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            try
            {
                await _authService.ForgotPasswordAsync(request.Email);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Forgot-password flow suppressed error for {Email}", request.Email?.Trim().ToLowerInvariant());
            }

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "If the email exists, OTP has been sent.",
                Data = null
            });
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            await _authService.ResetPasswordAsync(request.Email, request.Otp, request.NewPassword, request.ConfirmPassword);
            Response.Cookies.Delete("refreshToken");
            _logger.LogInformation("Password reset successful for {Email}", request.Email?.Trim().ToLowerInvariant());

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Password reset successfully.",
                Data = null
            });
        }

        [Authorize]
        [HttpPost("change-password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            var userId = GetRequiredUserIdFromClaims();

            await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword);
            Response.Cookies.Delete("refreshToken");

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Password changed successfully.",
                Data = null
            });
        }

        [Authorize]
        [HttpPost("logout")]
        public async Task<IActionResult> Logout()
        {
            var userId = GetRequiredUserIdFromClaims();

            await _authService.LogoutAsync(userId);
            Response.Cookies.Delete("refreshToken");
            _logger.LogInformation("Logout successful for UserId={UserId}", userId);

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Logged out successfully.",
                Data = null
            });
        }

        private IActionResult BuildValidationErrorResponse()
        {
            return BadRequest(new ApiResponse<object>
            {
                Success = false,
                Message = "Validation failed",
                Data = ModelState.Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(
                        x => x.Key,
                        x => x.Value!.Errors.Select(e => string.IsNullOrWhiteSpace(e.ErrorMessage) ? "Invalid value" : e.ErrorMessage).ToArray())
            });
        }

        private Guid GetRequiredUserIdFromClaims()
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? throw new UnauthorizedAccessException("Missing NameIdentifier claim.");

            if (!Guid.TryParse(userIdStr, out var userId))
                throw new UnauthorizedAccessException("Invalid NameIdentifier claim.");

            return userId;
        }
    }
}
