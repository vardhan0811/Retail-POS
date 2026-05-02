using AdminService.Entities;
using AdminService.Repositories;
using AdminService.DTOs;
using AdminService.Middleware;
using Shared.Contracts.Events;
using Shared.Contracts.Models;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace AdminService.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repo;
        private readonly AuthClient _authClient;
        private readonly ILogger<UserService> _logger;

        public UserService(IUserRepository repo, AuthClient authClient, ILogger<UserService> logger)
        {
            _repo = repo;
            _authClient = authClient;
            _logger = logger;
        }

        public async Task<User?> GetByIdAsync(Guid id) => await _repo.GetByIdAsync(id);

        public async Task<IEnumerable<User>> GetAllAsync() => await _repo.GetAllAsync();

        public async Task<PagedResult<UserDto>> GetPagedAsync(Guid? storeId, string? role, UserStatus? status, int page, int pageSize)
        {
            var (users, total) = await _repo.GetPagedAsync(storeId, role, status, page, pageSize);

            var items = users.Select(MapToDto).ToList();

            return new PagedResult<UserDto>
            {
                Items = items,
                TotalCount = total
            };
        }

        public async Task<IReadOnlyList<string>> GetRolesAsync()
        {
            return await _authClient.GetRolesAsync();
        }

        public async Task<IReadOnlyList<string>> GetPermissionsAsync()
        {
            return await _authClient.GetPermissionsAsync();
        }

        public async Task<UserDto> UpdateRoleAsync(Guid id, UpdateUserRoleRequest request)
        {
            if (id == Guid.Empty)
                throw new BusinessException("User id is required");
            if (request == null || string.IsNullOrWhiteSpace(request.Role))
                throw new BusinessException("Role is required");

            var normalizedRole = request.Role.Trim();

            // STRICT VALIDATION: Only Admin and Cashier are allowed
            var allowedRoles = new[] { "Admin", "Cashier" };
            if (!allowedRoles.Contains(normalizedRole, StringComparer.OrdinalIgnoreCase))
            {
                _logger.LogWarning("[User] Admin tried to assign invalid role: {Role}", normalizedRole);
                throw new BusinessException($"Invalid role choice: '{normalizedRole}'. Only Admin and Cashier are permitted.");
            }

            // LAST ADMIN PROTECTION: Prevent removing the very last admin
            var user = await _repo.GetByIdAsync(id);
            if (user != null && user.Role == "Admin" && normalizedRole == "Cashier")
            {
                var allAdmins = await _repo.GetPagedAsync(null, "Admin", null, 1, 10);
                if (allAdmins.Item2 <= 1)
                {
                    _logger.LogCritical("[User] Blocked attempt to downgrade the LAST Administrator: {UserId}", id);
                    throw new BusinessException("CRITICAL: Operation blocked. You cannot downgrade the last administrator in the system.");
                }
            }

            _logger.LogInformation("[User] Initiating role update for {UserId} to {Role}", id, normalizedRole);
            return await _authClient.UpdateUserRoleAsync(id, normalizedRole);
        }

        public async Task<UserDto> UpdateStatusAsync(Guid id, UpdateUserStatusRequest request)
        {
            if (id == Guid.Empty)
                throw new BusinessException("User id is required");
            if (request == null)
                throw new BusinessException("Status request is required");

            // Direct update to AuthService (System of record for lifecycle)
            return await _authClient.UpdateUserStatusAsync(id, request.Status);
        }

        public async Task<UserDto> AssignStoreAsync(Guid userId, UpdateUserStoreRequest request)
        {
            if (request.StoreIds == null || !request.StoreIds.Any())
                throw new BusinessException("At least one store must be assigned.");

            _logger.LogInformation("[User] Assigning {Count} Stores to User {UserId}", request.StoreIds.Count, userId);

            var user = await _repo.GetByIdAsync(userId);
            if (user == null)
                throw new NotFoundException("User not found");

            // Architectural Rule: Primary StoreId belongs to AdminService record for fast routing
            user.StoreId = request.StoreIds[0];
            
            // Sync the Many-to-Many join table
            await _repo.ClearUserStoresAsync(userId);
            foreach (var storeId in request.StoreIds)
            {
                await _repo.AddUserStoreAsync(new UserStore
                {
                    UserId = userId,
                    StoreId = storeId
                });
            }

            await _repo.UpdateAsync(user);

            // SYNC TO AUTH SERVICE (System of Record for Login/Profile)
            try
            {
                await _authClient.UpdateUserStoreAsync(userId, user.StoreId);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "[User] Failed to sync StoreId to AuthService for User {UserId}", userId);
                // Non-blocking for now, as Admin record is primary for routing
            }

            // Re-fetch to get navigation properties for the DTO
            var updated = await _repo.GetByIdAsync(userId);
            return MapToDto(updated!);
        }

        public async Task<UserDto> ApproveUserAsync(Guid id)
        {
            _logger.LogInformation("[User] Approving user: {UserId}", id);
            return await _authClient.ApproveUserAsync(id);
        }

        public async Task<UserDto> RejectUserAsync(Guid id, string reason)
        {
            _logger.LogInformation("[User] Rejecting user: {UserId}. Reason: {Reason}", id, reason);
            return await _authClient.RejectUserAsync(id, reason);
        }


        public async Task HandleUserCreatedEventAsync(UserCreatedEvent evt)
        {
            var existing = await _repo.GetByIdAsync(evt.UserId);

            if (existing == null)
            {
                await _repo.AddAsync(new User
                {
                    Id = evt.UserId,
                    UserName = evt.UserName,
                    Email = evt.Email,
                    Role = evt.Role,
                    Status = evt.Status,
                    StoreId = evt.StoreId
                });
                return;
            }

            existing.UserName = evt.UserName;
            existing.Email = evt.Email;
            existing.Role = evt.Role;
            existing.Status = evt.Status;

            await _repo.UpdateAsync(existing);
        }

        public async Task HandleUserRoleUpdatedEventAsync(UserRoleUpdatedEvent evt)
        {
            var user = await _repo.GetByIdAsync(evt.UserId);
            if (user == null)
                return;

            user.Role = evt.Role;
            await _repo.UpdateAsync(user);
        }

        public async Task HandleUserStatusUpdatedEventAsync(UserStatusUpdatedEvent evt)
        {
            var user = await _repo.GetByIdAsync(evt.UserId);
            if (user == null)
                return;

            user.Status = evt.Status;
            await _repo.UpdateAsync(user);
        }

        private UserDto MapToDto(User u)
        {
            var stores = u.UserStores?.Select(us => us.Store).Where(s => s != null).ToList() ?? new List<Store>();
            
            // System of record for Status is explicit (no longer derived)
            var currentStatus = u.Status;

            return new UserDto
            {
                Id = u.Id,
                UserName = u.UserName,
                Email = u.Email,
                Role = u.Role,
                Status = currentStatus,
                StoreId = u.StoreId,
                StoreName = stores.FirstOrDefault(s => s.Id == u.StoreId)?.Name ?? stores.FirstOrDefault()?.Name,
                AssignedStoreIds = stores.Select(s => s.Id).ToList(),
                AssignedStoreNames = stores.Select(s => s.Name).ToList()
            };
        }
    }
}
