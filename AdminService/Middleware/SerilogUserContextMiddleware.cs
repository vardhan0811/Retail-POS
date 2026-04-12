using Microsoft.AspNetCore.Http;
using Serilog.Context;
using System.Security.Claims;
using System.Threading.Tasks;

namespace AdminService.Middleware
{
    public sealed class SerilogUserContextMiddleware
    {
        private readonly RequestDelegate _next;
        public SerilogUserContextMiddleware(RequestDelegate next) => _next = next;

        public async Task Invoke(HttpContext context)
        {
            var email = context.User?.FindFirst(ClaimTypes.Email)?.Value;

            using (LogContext.PushProperty("UserEmail", email ?? "anonymous"))
            {
                await _next(context);
            }
        }
    }
}
