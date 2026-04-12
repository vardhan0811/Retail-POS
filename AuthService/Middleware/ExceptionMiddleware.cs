using System.Net;
using System.Text.Json;
using Microsoft.Extensions.Logging;

namespace AuthService.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionMiddleware> _logger;

        public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                int statusCode = (int)HttpStatusCode.BadRequest;
                string message;

                if (ex is NotFoundException)
                {
                    statusCode = (int)HttpStatusCode.NotFound;
                    message = ex.Message;
                }
                else if (ex is BusinessException)
                {
                    statusCode = (int)HttpStatusCode.BadRequest;
                    message = ex.Message;
                }
                else if (ex is UnauthorizedAccessException)
                {
                    statusCode = (int)HttpStatusCode.Forbidden;
                    message = "You do not have permission to perform this action. Admin access required.";
                }
                else
                {
                    statusCode = (int)HttpStatusCode.InternalServerError;
                    message = "Something went wrong";
                }

                _logger.LogError(ex, "Unhandled exception in AuthService");

                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json";

                var result = JsonSerializer.Serialize(new
                {
                    success = false,
                    message
                });

                await context.Response.WriteAsync(result);
            }
        }
    }
}
