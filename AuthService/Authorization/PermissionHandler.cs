using Microsoft.AspNetCore.Authorization;

namespace AuthService.Authorization
{
    public class PermissionHandler : AuthorizationHandler<PermissionRequirement>
    {
        private readonly Microsoft.Extensions.Logging.ILogger<PermissionHandler> _logger;

        public PermissionHandler(Microsoft.Extensions.Logging.ILogger<PermissionHandler> logger)
        {
            _logger = logger;
        }

        protected override Task HandleRequirementAsync(
            AuthorizationHandlerContext context,
            PermissionRequirement requirement)
        {
            var permissions = context.User.FindAll("permission")
                .Select(c => c.Value)
                .ToList();

            _logger.LogInformation("[Auth] Checking Policy Requirement: {Requirement}. User has permissions: {Permissions}", 
                requirement.Permission, string.Join(", ", permissions));

            if (permissions.Contains(requirement.Permission))
            {
                _logger.LogInformation("[Auth] Permission Granted: {Requirement}", requirement.Permission);
                context.Succeed(requirement);
            }
            else
            {
                _logger.LogWarning("[Auth] Permission Denied: {Requirement}", requirement.Permission);
            }

            return Task.CompletedTask;
        }
    }
}
