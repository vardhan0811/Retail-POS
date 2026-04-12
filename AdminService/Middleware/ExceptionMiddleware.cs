using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace AdminService.Middleware
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
                int statusCode = (int)HttpStatusCode.InternalServerError;
                string message;

                if (ex is NotFoundException)
                    statusCode = (int)HttpStatusCode.NotFound;
                else if (ex is BusinessException)
                    statusCode = (int)HttpStatusCode.BadRequest;

                message = statusCode == (int)HttpStatusCode.InternalServerError
                    ? "Something went wrong"
                    : ex.Message;

                _logger.LogError(ex, ex.Message);
                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json";
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    success = false,
                    message
                }));
            }
        }
    }
}
