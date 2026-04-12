using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Shared.Contracts.Events;
using Shared.Messaging.RabbitMq;
using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace NotificationService.Services
{
    public sealed class NotificationEventsConsumerHostedService : Shared.Messaging.RabbitMq.RabbitMqConsumerBase
    {
        private readonly ILogger<NotificationEventsConsumerHostedService> _logger;

        public NotificationEventsConsumerHostedService(
            IConfiguration config,
            ILogger<NotificationEventsConsumerHostedService> logger)
            : base(config, logger, "notification.events", "user.created", "bill.created", "stock.failed", "stock.reserved")
        {
            _logger = logger;
        }

        protected override Task ProcessMessageAsync(byte[] body, string routingKey, CancellationToken ct)
        {
            var json = Encoding.UTF8.GetString(body);
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            if (routingKey == "user.created")
            {
                var evt = JsonSerializer.Deserialize<UserCreatedEvent>(json, opts);
                _logger.LogInformation("user.created CorrelationId={CorrelationId}", evt?.CorrelationId);
            }
            else if (routingKey == "bill.created")
            {
                var evt = JsonSerializer.Deserialize<BillCreatedEvent>(json, opts);
                _logger.LogInformation("bill.created CorrelationId={CorrelationId}", evt?.CorrelationId);
            }
            else if (routingKey == "stock.failed")
            {
                var evt = JsonSerializer.Deserialize<StockFailedEvent>(json, opts);
                _logger.LogInformation("stock.failed CorrelationId={CorrelationId}", evt?.CorrelationId);
            }
            else if (routingKey == "stock.reserved")
            {
                var evt = JsonSerializer.Deserialize<StockReservedEvent>(json, opts);
                _logger.LogInformation("stock.reserved CorrelationId={CorrelationId}", evt?.CorrelationId);
            }

            return Task.CompletedTask;
        }
    }
}
