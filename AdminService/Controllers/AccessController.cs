using AdminService.DTOs;
using AdminService.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AdminService.Controllers
{
    [ApiController]
    [Route("api/admin")]
    [Authorize]
    public class AccessController : ControllerBase
    {
        private readonly IUserService _userService;

        public AccessController(IUserService userService)
        {
            _userService = userService;
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("roles")]
        public async Task<IActionResult> GetRoles()
        {
            var roles = await _userService.GetRolesAsync();
            return Ok(new ApiResponse<IReadOnlyList<string>>
            {
                Success = true,
                Message = "Roles fetched successfully",
                Data = roles
            });
        }

        [Authorize(Policy = "VIEW_ADMIN_READ")]
        [HttpGet("permissions")]
        public async Task<IActionResult> GetPermissions()
        {
            var permissions = await _userService.GetPermissionsAsync();
            return Ok(new ApiResponse<IReadOnlyList<string>>
            {
                Success = true,
                Message = "Permissions fetched successfully",
                Data = permissions
            });
        }
    }
}
