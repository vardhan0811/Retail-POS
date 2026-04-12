using AdminService.Entities;
using AdminService.Repositories;
using AdminService.DTOs;
using AdminService.Middleware;
using Shared.Contracts.Events;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Services
{
    public class UserService : IUserService
    {
        private readonly IUserRepository _repo;
        private readonly AuthClient _authClient;

        public UserService(IUserRepository repo, AuthClient authClient)
        {
            _repo = repo;
            _authClient = authClient;
        }

        public async Task<User?> GetByIdAsync(Guid id) => await _repo.GetByIdAsync(id);

        public async Task<IEnumerable<User>> GetAllAsync() => await _repo.GetAllAsync();

        public async Task<PagedResult<UserDto>> GetPagedAsync(Guid? storeId, string? role, bool? isActive, int page, int pageSize)
        {
            var (users, total) = await _repo.GetPagedAsync(storeId, role, isActive, page, pageSize);

            var items = users.Select(u => new UserDto
            {
                Id = u.Id,
                UserName = u.UserName,
                Email = u.Email,
                Role = u.Role,
                IsActive = u.IsActive,
                StoreId = u.StoreId
            }).ToList();

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

            return await _authClient.UpdateUserRoleAsync(id, request.Role.Trim());
        }

        public async Task<UserDto> UpdateStatusAsync(Guid id, UpdateUserStatusRequest request)
        {
            if (id == Guid.Empty)
                throw new BusinessException("User id is required");
            if (request == null)
                throw new BusinessException("Status request is required");

            return await _authClient.UpdateUserStatusAsync(id, request.IsActive);
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
                    IsActive = true,
                    StoreId = Guid.Empty
                });
                return;
            }

            existing.UserName = evt.UserName;
            existing.Email = evt.Email;
            existing.Role = evt.Role;
            existing.IsActive = true;

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

            user.IsActive = evt.IsActive;
            await _repo.UpdateAsync(user);
        }
    }
}
