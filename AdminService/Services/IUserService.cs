using AdminService.Entities;
using AdminService.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Shared.Contracts.Events;
using Shared.Contracts.Models;

namespace AdminService.Services
{
    public interface IUserService
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<IEnumerable<User>> GetAllAsync();
        Task<PagedResult<UserDto>> GetPagedAsync(Guid? storeId, string? role, UserStatus? status, int page, int pageSize);
        Task<IReadOnlyList<string>> GetRolesAsync();
        Task<IReadOnlyList<string>> GetPermissionsAsync();
        Task<UserDto> UpdateRoleAsync(Guid id, UpdateUserRoleRequest request);
        Task<UserDto> UpdateStatusAsync(Guid id, UpdateUserStatusRequest request);
        Task<UserDto> ApproveUserAsync(Guid id);
        Task<UserDto> RejectUserAsync(Guid id, string reason);
        
        // Store Assignment & Activation
        Task<UserDto> AssignStoreAsync(Guid userId, UpdateUserStoreRequest request);

        // RabbitMQ projection handlers (AuthService -> AdminService)
        Task HandleUserCreatedEventAsync(UserCreatedEvent evt);
        Task HandleUserRoleUpdatedEventAsync(UserRoleUpdatedEvent evt);
        Task HandleUserStatusUpdatedEventAsync(UserStatusUpdatedEvent evt);
    }
}
