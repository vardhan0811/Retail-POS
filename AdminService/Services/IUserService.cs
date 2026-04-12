using AdminService.Entities;
using AdminService.DTOs;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Shared.Contracts.Events;

namespace AdminService.Services
{
    public interface IUserService
    {
        Task<User?> GetByIdAsync(Guid id);
        Task<IEnumerable<User>> GetAllAsync();
        Task<PagedResult<UserDto>> GetPagedAsync(Guid? storeId, string? role, bool? isActive, int page, int pageSize);
        Task<IReadOnlyList<string>> GetRolesAsync();
        Task<IReadOnlyList<string>> GetPermissionsAsync();
        Task<UserDto> UpdateRoleAsync(Guid id, UpdateUserRoleRequest request);
        Task<UserDto> UpdateStatusAsync(Guid id, UpdateUserStatusRequest request);

        // RabbitMQ projection handler (AuthService -> AdminService)
        Task HandleUserCreatedEventAsync(UserCreatedEvent evt);
        Task HandleUserRoleUpdatedEventAsync(UserRoleUpdatedEvent evt);
        Task HandleUserStatusUpdatedEventAsync(UserStatusUpdatedEvent evt);
    }
}
