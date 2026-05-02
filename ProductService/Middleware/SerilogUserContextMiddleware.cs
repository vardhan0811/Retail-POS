using Microsoft.AspNetCore.Http;
using Serilog.Context;
using System.Security.Claims;
using System.Threading.Tasks;

namespace ProductService.Middleware
{
    public sealed class SerilogUserContextMiddleware
    {
        private readonly RequestDelegate _next;
        public SerilogUserContextMiddleware(RequestDelegate next) => _next = next;

        public async Task Invoke(HttpContext context)
        {
            var email = context.User?.FindFirst(ClaimTypes.Email)?.Value;
            var userId = context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            using (LogContext.PushProperty("UserEmail", email ?? "anonymous"))
            using (LogContext.PushProperty("UserId", userId ?? "anonymous"))
            {
                await _next(context);
            }
        }
    }
}
