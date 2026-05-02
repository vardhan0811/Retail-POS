using AuthService.Data;
using AuthService.DTOs;
using AuthService.Entities;
using AuthService.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using AuthService.Middleware;
using AuthService.Utils;
using Shared.Contracts.Events;
using Shared.Messaging.RabbitMq;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Shared.Contracts.Models;

namespace AuthService.Services
{
public class AuthServices : IAuthService
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtService _jwtService;
    private readonly AuthDbContext _context;
    private readonly RabbitMqPublisherBase _rabbitMqPublisher;
    private readonly NotificationClient _notificationClient;
    private readonly RegistrationCacheService _registrationCacheService;
    private readonly PasswordResetCacheService _passwordResetCacheService;
    private readonly RefreshTokenService _refreshTokenService;
    private readonly IConfiguration _config;
    private readonly ILogger<AuthServices> _logger;

    public AuthServices(
        IUserRepository userRepository,
        IJwtService jwtService,
        AuthDbContext context,
        RabbitMqPublisherBase rabbitMqPublisher,
        NotificationClient notificationClient,
        RegistrationCacheService registrationCacheService,
        PasswordResetCacheService passwordResetCacheService,
        RefreshTokenService refreshTokenService,
        IConfiguration config,
        ILogger<AuthServices> logger)
    {
        _userRepository = userRepository;
        _jwtService = jwtService;
        _context = context;
        _rabbitMqPublisher = rabbitMqPublisher;
        _notificationClient = notificationClient;
        _registrationCacheService = registrationCacheService;
        _passwordResetCacheService = passwordResetCacheService;
        _refreshTokenService = refreshTokenService;
        _config = config;
        _logger = logger;
    }

        public async Task RegisterAsync(RegisterRequest request)
        {
            request.Email = request.Email.Trim().ToLowerInvariant();

            // Step 0: Validate email format
            EmailValidator.ValidateEmail(request.Email);
            EnsureStrongPassword(request.Password);

            // Step 1: Check existing user
            var exists = await _userRepository.ExistsByEmailAsync(request.Email);
            if (exists)
                throw new BusinessException("User already exists");

            // Step 2: Send OTP to email
            var otpSent = await _notificationClient.SendOtpAsync(request.Email);
            if (!otpSent)
                throw new BusinessException("Failed to send OTP. Please try again.");

            // Step 3: Store registration details in cache until OTP is verified
            _registrationCacheService.StoreRegistration(request.Email, request);
            // Temporary storage; replace with DB-backed pending registration store when scaling beyond single-instance memory cache.
            // User is NOT created yet. Wait for OTP verification.
        }

        public async Task VerifyOtpAsync(string email, string otp)
        {
            email = email.Trim().ToLowerInvariant();

            var otpValid = await _notificationClient.VerifyOtpAsync(email, otp);
            if (!otpValid)
                throw new BusinessException("Invalid or expired OTP.");

            // if otp is valid then it retrieves the registration details from cache(IMemoryCache)
            var request = _registrationCacheService.GetRegistration(email);
            if (request == null)
                throw new BusinessException("Registration request expired. Please register again.");

            // Check again if user already exists (race condition safety)
            var exists = await _userRepository.ExistsByEmailAsync(email);
            if (exists)
                throw new BusinessException("User already exists");

            // Hash password
            var passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            // Create user (Requirement 1: No default role/store assignment)
            var user = new User
            {
                Id = Guid.NewGuid(),
                Name = request.Name,
                Email = request.Email,
                PasswordHash = passwordHash,
                RoleId = null, // Admin must assign
                StoreId = null, // Admin must assign
                Status = UserStatus.PendingApproval,
                CreatedAt = DateTime.UtcNow,
                AuthProvider = "Local"
            };

            await _userRepository.AddAsync(user);

            // Publish UserCreatedEvent
            var evt = new UserCreatedEvent
            {
                MessageId = Guid.NewGuid(),
                CorrelationId = Guid.NewGuid(),
                UserId = user.Id,
                Email = user.Email,
                UserName = user.Name,
                Role = null,
                StoreId = null,
                Status = UserStatus.PendingApproval,
                CreatedAt = user.CreatedAt
            };
            _rabbitMqPublisher.Publish(evt, "user.created");

            // Remove registration from cache
            _registrationCacheService.RemoveRegistration(email);
        }

        public async Task<AuthResponse> GoogleLoginAsync(string idToken, string? ipAddress)
        {
            var clientId = _config["Google:ClientId"];
            var settings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new[] { clientId }
            };

            GoogleJsonWebSignature.Payload payload;
            try
            {
                payload = await GoogleJsonWebSignature.ValidateAsync(idToken, settings);
            }
            catch (InvalidJwtException ex)
            {
                _logger.LogWarning(ex, "Invalid Google ID Token attempted.");
                throw new BusinessException("Invalid Google authentication token.");
            }

            var email = payload.Email.Trim().ToLowerInvariant();
            var user = await _userRepository.GetUserWithRoleAndPermissions(email);

            if (user == null)
            {
                // Requirement 1 & 4: Create as Unassigned
                user = new User
                {
                    Id = Guid.NewGuid(),
                    Name = payload.Name,
                    Email = email,
                    PasswordHash = null,
                    RoleId = null,
                    StoreId = null,
                    Status = UserStatus.PendingApproval,
                    CreatedAt = DateTime.UtcNow,
                    AuthProvider = "Google",
                    ProviderUserId = payload.Subject
                };

                await _userRepository.AddAsync(user);

                // Publish UserCreatedEvent
                _rabbitMqPublisher.Publish(new UserCreatedEvent
                {
                    MessageId = Guid.NewGuid(),
                    CorrelationId = Guid.NewGuid(),
                    UserId = user.Id,
                    Email = user.Email,
                    UserName = user.Name,
                    Role = null,
                    StoreId = null,
                    Status = UserStatus.PendingApproval,
                    CreatedAt = user.CreatedAt
                }, "user.created");
            }
            else
            {
                // Requirement 3: Explicitly link if not linked
                if (user.AuthProvider == "Local" || string.IsNullOrEmpty(user.ProviderUserId))
                {
                    user.AuthProvider = "Google";
                    user.ProviderUserId = payload.Subject;
                    await _userRepository.UpdateAsync(user);
                }
            }

            if (user.Status == UserStatus.Suspended)
                throw new BusinessException("Your account has been deactivated.");
            
            if (user.Status == UserStatus.Rejected)
                throw new BusinessException("Your account has been rejected. Please contact support.");

            if (user.Status == UserStatus.Locked)
                throw new BusinessException($"Your account is locked. Reason: {user.LockedReason ?? "Violation of security protocol"}");

            var permissions = user.Role?.RolePermissions?
                .Select(rp => rp.Permission.Name)
                .ToList() ?? new List<string>();

            var session = new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Role = user.Role?.Name ?? "Unassigned",
                StoreId = user.StoreId ?? Guid.Empty,
                IsActive = true
            };
            _context.UserSessions.Add(session);

            var audit = new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Action = "GoogleLogin",
                IpAddress = ipAddress
            };
            _context.AuthAuditLogs.Add(audit);

            await _context.SaveChangesAsync();

            var token = _jwtService.GenerateToken(user, permissions, session.Id);

            return new AuthResponse
            {
                Token = token,
                Email = user.Email,
                UserId = user.Id,
                Role = user.Role?.Name,
                Permissions = permissions,
                Status = user.Status,
                StoreId = user.StoreId,
                SessionId = session.Id
            };
        }

        

        public async Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress)
        {
            request.Email = request.Email.Trim().ToLowerInvariant();

            var user = await _userRepository.GetUserWithRoleAndPermissions(request.Email);

            if (user == null)
                throw new BusinessException("Invalid credentials");

            if (user.Status == UserStatus.Suspended)
                throw new BusinessException("Your account has been deactivated by the admin.");

            if (user.Status == UserStatus.Rejected)
                throw new BusinessException("Your account has been rejected. Please contact support.");

            if (user.Status == UserStatus.Locked)
                throw new BusinessException($"Your account is locked. Reason: {user.LockedReason ?? "Violation of security protocol"}");

            var isValid = BCrypt.Net.BCrypt.Verify(
                request.Password,
                user.PasswordHash);

            if (!isValid)
                throw new BusinessException("Invalid credentials");

            var permissions = user.Role?.RolePermissions?
                .Select(rp => rp.Permission.Name)
                .ToList() ?? new List<string>();

            var session = new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TerminalId = request.TerminalId,
                Role = user.Role?.Name ?? "Unassigned",
                StoreId = user.StoreId ?? Guid.Empty,
                IsActive = true
            };
            _context.UserSessions.Add(session);

            var audit = new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Action = "Login",
                IpAddress = ipAddress,
                TerminalId = request.TerminalId
            };
            _context.AuthAuditLogs.Add(audit);

            if (request.TerminalId.HasValue)
            {
                var terminal = await _context.Terminals.FindAsync(request.TerminalId.Value);
                if (terminal != null)
                {
                    terminal.LastActive = DateTime.UtcNow;
                }
            }

            await _context.SaveChangesAsync();

            var token = _jwtService.GenerateToken(user, permissions, session.Id, request.TerminalId);

            return new AuthResponse
            {
                Token = token,
                Email = user.Email,
                UserId = user.Id,
                Role = user.Role?.Name,
                Permissions = permissions,
                Status = user.Status,
                StoreId = user.StoreId,
                SessionId = session.Id
            };
        }

        public async Task<AuthResponse?> RefreshAsync(string refreshToken, string? ipAddress)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                return null;

            var userId = _refreshTokenService.GetUserIdFromToken(refreshToken);
            if (!userId.HasValue)
                return null;

            var user = await _userRepository.GetUserWithRoleAndPermissionsById(userId.Value);
            if (user == null || user.Status == UserStatus.Suspended)
                return null;

            var permissions = user.Role?.RolePermissions?
                .Select(rp => rp.Permission?.Name)
                .Where(p => !string.IsNullOrWhiteSpace(p))
                .Select(p => p!)
                .ToList() ?? new List<string>();

            _refreshTokenService.RevokeByToken(refreshToken);

            // We could optionally create a new session here, or link to an existing active one.
            // For simplicity, we just generate the token.
            var newJwt = _jwtService.GenerateToken(user, permissions);
            var newRefreshToken = _refreshTokenService.GenerateRefreshToken(user.Id);

            return new AuthResponse
            {
                Token = newJwt,
                Email = user.Email,
                UserId = user.Id,
                Role = user.Role?.Name,
                Permissions = permissions,
                Status = user.Status,
                StoreId = user.StoreId,
                RefreshToken = newRefreshToken
            };
        }

        public async Task ForgotPasswordAsync(string email)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            EmailValidator.ValidateEmail(normalizedEmail);

            var user = await _userRepository.GetByEmailAsync(normalizedEmail);

            if (user != null)
            {
                var otpSent = await _notificationClient.SendOtpAsync(normalizedEmail);
                if (otpSent)
                {
                    _passwordResetCacheService.SetPending(normalizedEmail);
                }
                else
                {
                    _logger.LogWarning("Failed to send forgot-password OTP for existing user {Email}", normalizedEmail);
                }
            }
        }

        public async Task ResetPasswordAsync(string email, string otp, string newPassword, string confirmPassword)
        {
            var normalizedEmail = email.Trim().ToLowerInvariant();
            EmailValidator.ValidateEmail(normalizedEmail);

            if (!string.Equals(newPassword, confirmPassword, StringComparison.Ordinal))
                throw new BusinessException("Confirm password does not match new password");

            EnsureStrongPassword(newPassword);

            if (!_passwordResetCacheService.IsPending(normalizedEmail))
                throw new BusinessException("Password reset request expired. Please request OTP again.");

            if (!_passwordResetCacheService.CanAttempt(normalizedEmail, 3))
                throw new BusinessException("Too many invalid OTP attempts. Please request a new OTP.");

            var otpValid = await _notificationClient.VerifyOtpAsync(normalizedEmail, otp);
            if (!otpValid)
            {
                var failedAttempts = _passwordResetCacheService.IncrementFailedAttempt(normalizedEmail);
                if (failedAttempts >= 3)
                {
                    _passwordResetCacheService.Clear(normalizedEmail);
                    throw new BusinessException("Too many invalid OTP attempts. Please request a new OTP.");
                }

                throw new BusinessException("Invalid or expired OTP.");
            }

            var user = await _userRepository.GetByEmailAsync(normalizedEmail);
            if (user == null)
                throw new NotFoundException("User not found");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _userRepository.UpdateAsync(user);

            _refreshTokenService.RevokeAllForUser(user.Id);
            _passwordResetCacheService.Clear(normalizedEmail);
        }

        public async Task ChangePasswordAsync(Guid userId, string currentPassword, string newPassword, string? ipAddress)
        {
            if (userId == Guid.Empty)
                throw new BusinessException("User id is required");

            if (string.Equals(currentPassword, newPassword, StringComparison.Ordinal))
                throw new BusinessException("New password must be different from current password");

            EnsureStrongPassword(newPassword);

            var user = await _userRepository.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found");

            var isValid = BCrypt.Net.BCrypt.Verify(currentPassword, user.PasswordHash);
            if (!isValid)
                throw new BusinessException("Current password is incorrect");

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _userRepository.UpdateAsync(user);

            var audit = new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Action = "ChangePassword",
                IpAddress = ipAddress
            };
            _context.AuthAuditLogs.Add(audit);
            await _context.SaveChangesAsync();

            _refreshTokenService.RevokeAllForUser(user.Id);
        }

        public async Task LogoutAsync(Guid userId, Guid sessionId)
        {
            if (userId == Guid.Empty)
                throw new BusinessException("User id is required");

            var session = await _context.UserSessions.FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);
            if (session != null)
            {
                session.IsActive = false;
                session.LogoutTime = DateTime.UtcNow;

                var audit = new AuthAuditLog
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Action = "Logout",
                    TerminalId = session.TerminalId
                };
                _context.AuthAuditLogs.Add(audit);

                await _context.SaveChangesAsync();
            }

            _refreshTokenService.RevokeAllForUser(userId);
        }

        public async Task LogoutAllSessionsAsync(Guid userId)
        {
            if (userId == Guid.Empty)
                throw new BusinessException("User id is required");

            var activeSessions = await _context.UserSessions.Where(s => s.UserId == userId && s.IsActive).ToListAsync();
            foreach (var session in activeSessions)
            {
                session.IsActive = false;
                session.LogoutTime = DateTime.UtcNow;
            }

            var audit = new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Action = "LogoutAll"
            };
            _context.AuthAuditLogs.Add(audit);

            await _context.SaveChangesAsync();
            _refreshTokenService.RevokeAllForUser(userId);
        }

        public async Task<UserProfileDto> GetUserProfileAsync(Guid userId)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .ThenInclude(r => r!.RolePermissions)
                .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
                throw new NotFoundException("User not found");

            var activeSession = await _context.UserSessions
                .Include(s => s.Terminal)
                .Where(s => s.UserId == userId && s.IsActive)
                .OrderByDescending(s => s.LoginTime)
                .FirstOrDefaultAsync();

            var permissions = user.Role?.RolePermissions?
                .Select(rp => rp.Permission.Name)
                .ToList() ?? new List<string>();

            // Requirement 4: Derive Status (Active only if Role and Store are assigned)
            var derivedStatus = user.Status.ToString();
            if (user.Status != UserStatus.Suspended)
            {
                if (user.RoleId == null || user.StoreId == null || user.StoreId == Guid.Empty)
                {
                    derivedStatus = "Pending";
                }
                else
                {
                    derivedStatus = "Active";
                }
            }

            return new UserProfileDto
            {
                Id = user.Id,
                Name = user.Name,
                Email = user.Email,
                Role = user.Role?.Name,
                Status = derivedStatus,
                StoreId = user.StoreId,
                Permissions = permissions,
                ActiveSessionId = activeSession?.Id,
                ActiveTerminalName = activeSession?.Terminal?.Name,
                LastLogin = activeSession?.LoginTime
            };
        }

        public async Task<SessionInfoDto?> GetActiveSessionAsync(Guid userId, Guid sessionId)
        {
            var session = await _context.UserSessions
                .Include(s => s.Terminal)
                .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId);

            if (session == null) return null;

            return new SessionInfoDto
            {
                SessionId = session.Id,
                TerminalId = session.TerminalId,
                TerminalName = session.Terminal?.Name ?? "Unknown Device",
                LoginTime = session.LoginTime,
                LastActivity = session.LastActivity,
                IsActive = session.IsActive
            };
        }

        public async Task<List<AuthAuditLogDto>> GetLoginHistoryAsync(Guid userId, int count = 10)
        {
            var logs = await _context.AuthAuditLogs
                .Where(a => a.UserId == userId && (a.Action == "Login" || a.Action == "GoogleLogin"))
                .OrderByDescending(a => a.Timestamp)
                .Take(count)
                .ToListAsync();

            return logs.Select(a => new AuthAuditLogDto
            {
                Id = a.Id,
                Action = a.Action,
                Timestamp = a.Timestamp,
                IpAddress = a.IpAddress,
                Details = a.Details,
                TerminalName = a.TerminalId.HasValue ? _context.Terminals.Find(a.TerminalId.Value)?.Name : null
            }).ToList();
        }

        public async Task<UserIdentityViewDto> UpdateUserRoleAsync(Guid userId, string role, Guid callerId)
        {
            if (userId == Guid.Empty)
                throw new BusinessException("User id is required");
            if (string.IsNullOrWhiteSpace(role))
                throw new BusinessException("Role is required");

            var normalizedRole = role.Trim();

            // VALIDATION: Only Admin and Cashier are allowed
            var allowedRoles = new[] { "Admin", "Cashier" };
            if (!allowedRoles.Contains(normalizedRole, StringComparer.OrdinalIgnoreCase))
            {
                _logger.LogWarning("[Auth] Rejecting illegal role assignment: {Role} for User {UserId}", normalizedRole, userId);
                throw new BusinessException($"Illegal Role: '{normalizedRole}'. Only 'Admin' and 'Cashier' roles are permitted.");
            }

            // Normalize to match seeder case (e.g. Admin, Cashier)
            if (normalizedRole.Equals("admin", StringComparison.OrdinalIgnoreCase)) normalizedRole = "Admin";
            if (normalizedRole.Equals("cashier", StringComparison.OrdinalIgnoreCase)) normalizedRole = "Cashier";

            // SECURITY: Prevent an Admin from modifying their own role
            if (userId == callerId)
            {
                _logger.LogWarning("[Auth] Security Override: Admin {CallerId} tried to modify their own role", callerId);
                throw new BusinessException("Security Violation: You cannot modify your own role or permissions. Please contact another Administrator.");
            }

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new NotFoundException("User not found");

            var targetRole = await _context.Roles.FirstOrDefaultAsync(r => r.Name == normalizedRole);
            if (targetRole == null)
            {
                 _logger.LogError("[Auth] Critical Config Error: Role '{Role}' validated but not found in Database.", normalizedRole);
                 throw new BusinessException("Role configuration error on server. Please contact support.");
            }

            if (user.RoleId == targetRole.Id)
            {
                return new UserIdentityViewDto
                {
                    Id = user.Id,
                    UserName = user.Name,
                    Email = user.Email,
                    Role = targetRole.Name,
                    Status = user.Status,
                    StoreId = user.StoreId
                };
            }

            user.RoleId = targetRole.Id;
            await _userRepository.UpdateAsync(user);

            _rabbitMqPublisher.Publish(new UserRoleUpdatedEvent
            {
                MessageId = Guid.NewGuid(),
                CorrelationId = Guid.NewGuid(),
                UserId = user.Id,
                Role = targetRole.Name,
                UpdatedAt = DateTime.UtcNow
            }, "user.role.updated");

            return new UserIdentityViewDto
            {
                Id = user.Id,
                UserName = user.Name,
                Email = user.Email,
                Role = targetRole.Name,
                Status = user.Status,
                StoreId = user.StoreId
            };
        }

        public async Task<UserIdentityViewDto> UpdateUserStoreAsync(Guid userId, Guid? storeId)
        {
            if (userId == Guid.Empty)
                throw new BusinessException("User id is required");

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new NotFoundException("User not found");

            user.StoreId = storeId;
            await _userRepository.UpdateAsync(user);

            return new UserIdentityViewDto
            {
                Id = user.Id,
                UserName = user.Name,
                Email = user.Email,
                Role = user.Role?.Name,
                Status = user.Status,
                StoreId = user.StoreId
            };
        }


        public async Task<UserIdentityViewDto> UpdateUserStatusAsync(Guid userId, UserStatus status)
        {
            if (userId == Guid.Empty)
                throw new BusinessException("User id is required");

            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new NotFoundException("User not found");

            if (user.Status != status)
            {
                user.Status = status;
                await _userRepository.UpdateAsync(user);
                
                if (status == UserStatus.Suspended || status == UserStatus.Locked)
                {
                    _refreshTokenService.RevokeAllForUser(userId);
                }

                _context.AuthAuditLogs.Add(new AuthAuditLog
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Action = status == UserStatus.Locked ? "AccountLocked" : "StatusUpdated",
                    Details = $"Status changed to {status}",
                    Timestamp = DateTime.UtcNow
                });
                await _context.SaveChangesAsync();

                _rabbitMqPublisher.Publish(new UserStatusUpdatedEvent
                {
                    MessageId = Guid.NewGuid(),
                    CorrelationId = Guid.NewGuid(),
                    UserId = user.Id,
                    Status = user.Status,
                    UpdatedAt = DateTime.UtcNow
                }, "user.status.updated");
            }

            return new UserIdentityViewDto
            {
                Id = user.Id,
                UserName = user.Name,
                Email = user.Email,
                Role = user.Role?.Name,
                Status = user.Status,
                StoreId = user.StoreId
            };
        }

        public async Task<UserIdentityViewDto> ApproveUserAsync(Guid userId, string adminEmail)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new NotFoundException("User not found");

            if (user.Status == UserStatus.Active || user.Status == UserStatus.Registered)
                throw new BusinessException("User is already active.");

            user.Status = UserStatus.Registered;
            user.ApprovedBy = adminEmail;
            user.ApprovedAt = DateTime.UtcNow;

            await _userRepository.UpdateAsync(user);

            _context.AuthAuditLogs.Add(new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Action = "UserApproved",
                Details = $"Approved by {adminEmail}",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            _rabbitMqPublisher.Publish(new UserStatusUpdatedEvent
            {
                MessageId = Guid.NewGuid(),
                CorrelationId = Guid.NewGuid(),
                UserId = user.Id,
                Status = user.Status,
                UpdatedAt = DateTime.UtcNow
            }, "user.status.updated");

            return new UserIdentityViewDto
            {
                Id = user.Id,
                UserName = user.Name,
                Email = user.Email,
                Role = user.Role?.Name,
                Status = user.Status,
                StoreId = user.StoreId
            };
        }

        public async Task<UserIdentityViewDto> RejectUserAsync(Guid userId, string adminEmail, string reason)
        {
            var user = await _context.Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Id == userId)
                ?? throw new NotFoundException("User not found");

            user.Status = UserStatus.Rejected;
            user.LockedReason = reason;

            await _userRepository.UpdateAsync(user);

            _context.AuthAuditLogs.Add(new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Action = "UserRejected",
                Details = $"Rejected by {adminEmail}. Reason: {reason}",
                Timestamp = DateTime.UtcNow
            });
            await _context.SaveChangesAsync();

            _rabbitMqPublisher.Publish(new UserStatusUpdatedEvent
            {
                MessageId = Guid.NewGuid(),
                CorrelationId = Guid.NewGuid(),
                UserId = user.Id,
                Status = user.Status,
                UpdatedAt = DateTime.UtcNow
            }, "user.status.updated");

            return new UserIdentityViewDto
            {
                Id = user.Id,
                UserName = user.Name,
                Email = user.Email,
                Role = user.Role?.Name,
                Status = user.Status,
                StoreId = user.StoreId
            };
        }

        public async Task<IReadOnlyList<string>> GetRolesAsync()
        {
            return await _context.Roles
                .AsNoTracking()
                .Select(r => r.Name)
                .OrderBy(n => n)
                .ToListAsync();
        }

        public async Task<AuthResponse> StartSessionAsync(Guid userId, Guid? terminalId, Guid storeId, string? ipAddress)
        {
            var user = await _userRepository.GetUserWithRoleAndPermissionsById(userId);
            if (user == null)
                throw new NotFoundException("User not found");

            if (user.Status == UserStatus.Suspended)
                throw new BusinessException("Account is suspended");

            // Role-based Store Validation
            if (user.Role?.Name == "Cashier")
            {
                if (user.StoreId != storeId)
                {
                    throw new BusinessException($"Security Alert: Access denied to store {storeId}. You are assigned to {user.StoreId}.");
                }
            }
            else if (user.Role?.Name != "Admin" && user.Role?.Name != "Manager")
            {
                throw new BusinessException("Access Denied: Only Admin, Manager, or Cashier roles can start POS sessions.");
            }

            // Enforce store existence (optional but recommended)
            if (storeId == Guid.Empty)
            {
                throw new BusinessException("Store selection is mandatory to initialize session.");
            }

            var permissions = user.Role?.RolePermissions?
                .Select(rp => rp.Permission.Name)
                .ToList() ?? new List<string>();

            var session = new UserSession
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                TerminalId = terminalId,
                StoreId = storeId,
                Role = user.Role?.Name ?? "Cashier",
                IsActive = true
            };
            _context.UserSessions.Add(session);

            var audit = new AuthAuditLog
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Action = "ManualSessionStart",
                IpAddress = ipAddress,
                Details = $"POS Session started for Store {storeId} with role {session.Role}"
            };
            _context.AuthAuditLogs.Add(audit);

            await _context.SaveChangesAsync();

            // We generate a specialized token for the POS session
            // This token includes the specific storeId and sessionId
            var token = _jwtService.GenerateToken(user, permissions, session.Id, terminalId);

            return new AuthResponse
            {
                Token = token,
                Email = user.Email,
                UserId = user.Id,
                Role = session.Role,
                Permissions = permissions,
                StoreId = storeId,
                SessionId = session.Id
            };
        }

        public async Task<IReadOnlyList<string>> GetPermissionsAsync()
        {
            return await _context.Permissions
                .AsNoTracking()
                .Select(p => p.Name)
                .OrderBy(n => n)
                .ToListAsync();
        }


        public async Task<int> GetActiveStaffCountAsync()
        {
            return await _context.Users.CountAsync(u => u.Status == UserStatus.Active);
        }

        private static void EnsureStrongPassword(string password)
        {
            if (string.IsNullOrWhiteSpace(password))
                throw new BusinessException("Password is required");

            if (password.Length < 8)
                throw new BusinessException("Password must be at least 8 characters long");

            if (!password.Any(char.IsUpper))
                throw new BusinessException("Password must contain at least one uppercase letter");

            if (!password.Any(ch => !char.IsLetterOrDigit(ch)))
                throw new BusinessException("Password must contain at least one special character");
        }

    }
}