using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using RabbitMQ.Client;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace BillingService.HealthChecks
{
    public sealed class RabbitMqHealthCheck : IHealthCheck
    {
        private readonly IConfiguration _config;

        public RabbitMqHealthCheck(IConfiguration config)
        {
            _config = config;
        }

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var factory = new ConnectionFactory
                {
                    HostName = _config["RabbitMQ:Host"],
                    UserName = _config["RabbitMQ:Username"],
                    Password = _config["RabbitMQ:Password"],
                    RequestedConnectionTimeout = TimeSpan.FromSeconds(2),
                    AutomaticRecoveryEnabled = true
                };

                using var conn = factory.CreateConnection();
                using var channel = conn.CreateModel();
                return Task.FromResult(HealthCheckResult.Healthy("RabbitMQ connection OK"));
            }
            catch (Exception ex)
            {
                return Task.FromResult(HealthCheckResult.Unhealthy("RabbitMQ connection failed", ex));
            }
        }
    }
}

