using Microsoft.AspNetCore.Http;
using Serilog;
using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;

namespace BillingService.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;
        public ExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }
        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Unhandled exception occurred");

                int statusCode = (int)HttpStatusCode.InternalServerError;
                string message = ex.Message;

                if (ex is NotFoundException)
                    statusCode = (int)HttpStatusCode.NotFound;
                else if (ex is BusinessException)
                    statusCode = (int)HttpStatusCode.BadRequest;
                else if (ex is ForbiddenException)
                    statusCode = (int)HttpStatusCode.Forbidden;
                else if (ex is ServiceUnavailableException)
                    statusCode = (int)HttpStatusCode.ServiceUnavailable;

                context.Response.StatusCode = statusCode;
                context.Response.ContentType = "application/json";
                var result = JsonSerializer.Serialize(new { success = false, message });
                await context.Response.WriteAsync(result);
            }
        }
    }
}
