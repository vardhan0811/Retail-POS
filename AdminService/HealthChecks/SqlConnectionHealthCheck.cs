using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace AdminService.HealthChecks
{
    public sealed class SqlConnectionHealthCheck : IHealthCheck
    {
        private readonly IConfiguration _config;

        public SqlConnectionHealthCheck(IConfiguration config)
        {
            _config = config;
        }

        public async Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            var connString = _config.GetConnectionString("DefaultConnection");
            if (string.IsNullOrWhiteSpace(connString))
                return HealthCheckResult.Unhealthy("Missing ConnectionStrings:DefaultConnection");

            try
            {
                await using var conn = new SqlConnection(connString);
                await conn.OpenAsync(cancellationToken);
                await conn.CloseAsync();
                return HealthCheckResult.Healthy("SQL connection OK");
            }
            catch (Exception ex)
            {
                return HealthCheckResult.Unhealthy("SQL connection failed", ex);
            }
        }
    }
}

