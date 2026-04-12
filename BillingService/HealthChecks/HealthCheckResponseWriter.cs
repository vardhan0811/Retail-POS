using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace BillingService.HealthChecks
{
    public static class HealthCheckResponseWriter
    {
        public static Task WriteAsync(HttpContext context, HealthReport report)
        {
            context.Response.ContentType = "application/json; charset=utf-8";

            var payload = new
            {
                status = report.Status.ToString(),
                checks = report.Entries.ToDictionary(
                    e => e.Key,
                    e => new
                    {
                        status = e.Value.Status.ToString(),
                        description = e.Value.Description,
                        error = e.Value.Exception?.Message
                    }),
                totalDurationMs = (int)Math.Round(report.TotalDuration.TotalMilliseconds)
            };

            return context.Response.WriteAsync(JsonSerializer.Serialize(payload, new JsonSerializerOptions
            {
                WriteIndented = true
            }));
        }
    }
}

