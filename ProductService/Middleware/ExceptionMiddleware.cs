using System.Net;
using System.Text.Json;
using Serilog;

namespace ProductService.Middleware
{
    public class ExceptionMiddleware
    {
        private readonly RequestDelegate _next;

        public ExceptionMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context); // 🔥 go to next middleware / controller
            }
            catch (Exception ex)
            {
                await HandleExceptionAsync(context, ex);
            }
        }

        private static Task HandleExceptionAsync(HttpContext context, Exception ex)
        {
            Log.Error(ex, "Unhandled exception occurred");

            context.Response.ContentType = "application/json";

            int statusCode = (int)HttpStatusCode.InternalServerError;
            string message = "Something went wrong";

            // 🔥 CUSTOM HANDLING
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
            else if (ex is ArgumentException or System.ComponentModel.DataAnnotations.ValidationException)
            {
                statusCode = (int)HttpStatusCode.BadRequest;
                message = ex.Message;
            }
#if DEBUG
            else
            {
                message = ex.Message;
            }
#endif

            context.Response.StatusCode = statusCode;

            var result = JsonSerializer.Serialize(new
            {
                success = false,
                message = message
            });

            return context.Response.WriteAsync(result);
        }
    }
}