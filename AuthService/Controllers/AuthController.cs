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
        private readonly IConfiguration _configuration;

        public AuthController(IAuthService authService, RefreshTokenService refreshTokenService, ILogger<AuthController> logger, IWebHostEnvironment environment, IConfiguration configuration)
        {
            _authService = authService;
            _refreshTokenService = refreshTokenService;
            _logger = logger;
            _environment = environment;
            _configuration = configuration;
        }

        [Authorize]
        [HttpGet("me")]
        public async Task<IActionResult> GetMe()
        {
            var userId = GetRequiredUserIdFromClaims();
            var profile = await _authService.GetUserProfileAsync(userId);

            return Ok(new ApiResponse<UserProfileDto>
            {
                Success = true,
                Message = "User profile fetched successfully",
                Data = profile
            });
        }

        [Authorize]
        [HttpGet("session")]
        public async Task<IActionResult> GetSession()
        {
            var userId = GetRequiredUserIdFromClaims();
            var sessionIdClaim = User.FindFirst("sessionId")?.Value;

            if (!Guid.TryParse(sessionIdClaim, out var sessionId))
            {
                return BadRequest(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Session ID not found in token."
                });
            }

            var session = await _authService.GetActiveSessionAsync(userId, sessionId);
            if (session == null)
            {
                return NotFound(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Active session not found."
                });
            }

            return Ok(new ApiResponse<SessionInfoDto>
            {
                Success = true,
                Message = "Session info fetched successfully",
                Data = session
            });
        }

        [Authorize]
        [HttpGet("login-history")]
        public async Task<IActionResult> GetLoginHistory()
        {
            var userId = GetRequiredUserIdFromClaims();
            var history = await _authService.GetLoginHistoryAsync(userId);

            return Ok(new ApiResponse<List<AuthAuditLogDto>>
            {
                Success = true,
                Message = "Login history fetched successfully",
                Data = history
            });
        }

        [HttpGet("config/google")]
        [AllowAnonymous]
        public IActionResult GetGoogleConfig()
        {
            var clientId = _configuration["Google:ClientId"];
            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Google configuration fetched successfully",
                Data = new { clientId }
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
            _logger.LogInformation("[Admin] Incoming role update request. Target: {UserId}, Role: {Role}", id, request.Role);
            
            if (!ModelState.IsValid)
            {
                _logger.LogWarning("[Admin] Role update validation failed for {UserId}", id);
                return BuildValidationErrorResponse();
            }

            var callerId = GetRequiredUserIdFromClaims();
            var updated = await _authService.UpdateUserRoleAsync(id, request.Role, callerId);
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
            _logger.LogInformation("[Admin] Incoming status update request. Target: {UserId}, Status: {Status}", id, request.Status);
            var updated = await _authService.UpdateUserStatusAsync(id, request.Status);
            return Ok(new ApiResponse<UserIdentityViewDto>
            {
                Success = true,
                Message = "User status updated successfully",
                Data = updated
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpPut("users/{id}/store")]
        public async Task<IActionResult> UpdateUserStore(Guid id, [FromBody] UpdateUserStoreAdminRequest request)
        {
            _logger.LogInformation("[Admin] Incoming store update request. Target: {UserId}, StoreId: {StoreId}", id, request.StoreId);
            var updated = await _authService.UpdateUserStoreAsync(id, request.StoreId);
            return Ok(new ApiResponse<UserIdentityViewDto>
            {
                Success = true,
                Message = "User store updated successfully",
                Data = updated
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpPost("users/{id}/approve")]
        public async Task<IActionResult> ApproveUser(Guid id)
        {
            _logger.LogInformation("[Admin] Approving user: {UserId}", id);
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "system-admin@retailpos.com";
            var updated = await _authService.ApproveUserAsync(id, adminEmail);
            return Ok(new ApiResponse<UserIdentityViewDto>
            {
                Success = true,
                Message = "User approved successfully",
                Data = updated
            });
        }

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpPost("users/{id}/reject")]
        public async Task<IActionResult> RejectUser(Guid id, [FromBody] RejectUserAdminRequest request)
        {
            _logger.LogInformation("[Admin] Rejecting user: {UserId}. Reason: {Reason}", id, request.Reason);
            var adminEmail = User.FindFirst(ClaimTypes.Email)?.Value ?? "system-admin@retailpos.com";
            var updated = await _authService.RejectUserAsync(id, adminEmail, request.Reason);
            return Ok(new ApiResponse<UserIdentityViewDto>
            {
                Success = true,
                Message = "User rejected successfully",
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

        [Authorize(Roles = "Admin", Policy = "MANAGE_USERS")]
        [HttpGet("staff/active-count")]
        public async Task<IActionResult> GetActiveStaffCount()
        {
            var count = await _authService.GetActiveStaffCountAsync();
            return Ok(new ApiResponse<int>
            {
                Success = true,
                Message = "Active staff count fetched successfully",
                Data = count
            });
        }

        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid email or password",
                    Data = null
                });
            }

            AuthResponse response;
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                response = await _authService.LoginAsync(request, ipAddress);
            }
            catch (BusinessException)
            {
                _logger.LogWarning("Login failed for {Email}", request.Email?.Trim().ToLowerInvariant());
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid email or password",
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during login for {Email}", request.Email);
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Invalid email or password",
                    Data = null
                });
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

        [HttpPost("google-login")]
        [AllowAnonymous]
        public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            AuthResponse response;
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                response = await _authService.GoogleLoginAsync(request.IdToken, ipAddress);
            }
            catch (BusinessException ex)
            {
                _logger.LogWarning("Google login failed: {Message}", ex.Message);
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = ex.Message,
                    Data = null
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during Google login.");
                return Unauthorized(new ApiResponse<object>
                {
                    Success = false,
                    Message = "Authentication failed",
                    Data = null
                });
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

            _logger.LogInformation("Google login successful for UserId={UserId}", response.UserId);

            return Ok(new ApiResponse<object>
            {
                Success = true,
                Message = "Google login successful",
                Data = response
            });
        }

        [HttpPost("refresh")]
        [AllowAnonymous]
        public async Task<IActionResult> Refresh()
        {
            if (!Request.Cookies.TryGetValue("refreshToken", out var refreshToken))
                return Unauthorized(new ApiResponse<string> { Success = false, Message = "No refresh token", Data = null });

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var authResponse = await _authService.RefreshAsync(refreshToken, ipAddress);
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
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

            await _authService.ChangePasswordAsync(userId, request.CurrentPassword, request.NewPassword, ipAddress);
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
            var sessionIdClaim = User.FindFirst("sessionId")?.Value;
            
            if (Guid.TryParse(sessionIdClaim, out var sessionId))
            {
                await _authService.LogoutAsync(userId, sessionId);
            }

            Response.Cookies.Delete("refreshToken");
            _logger.LogInformation("Logout successful for UserId={UserId}", userId);

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Logged out successfully.",
                Data = null
            });
        }



        [Authorize]
        [HttpPost("logout-all")]
        public async Task<IActionResult> LogoutAll()
        {
            var userId = GetRequiredUserIdFromClaims();

            await _authService.LogoutAllSessionsAsync(userId);
            Response.Cookies.Delete("refreshToken");
            _logger.LogInformation("Logout all sessions successful for UserId={UserId}", userId);

            return Ok(new ApiResponse<string>
            {
                Success = true,
                Message = "Logged out of all sessions successfully.",
                Data = null
            });
        }

        [Authorize(Roles = "Admin")]
        [HttpPost("sessions/start")]
        public async Task<IActionResult> StartSession([FromBody] StartSessionRequest request)
        {
            if (!ModelState.IsValid)
                return BuildValidationErrorResponse();

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var response = await _authService.StartSessionAsync(request.UserId, request.TerminalId, request.StoreId, ipAddress);

            return Ok(new ApiResponse<AuthResponse>
            {
                Success = true,
                Message = "Session initialized successfully",
                Data = response
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
