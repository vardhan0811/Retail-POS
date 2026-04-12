using BillingService.Data;
using BillingService.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Shared.Contracts.Events;
using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace BillingService.Services
{
    public sealed class RabbitMqConsumerHostedService : Shared.Messaging.RabbitMq.RabbitMqConsumerBase
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public RabbitMqConsumerHostedService(
            IConfiguration config,
            ILogger<RabbitMqConsumerHostedService> logger,
            IServiceScopeFactory scopeFactory)
            : base(config, logger, "billing.stock.events", "stock.reserved", "stock.failed")
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ProcessMessageAsync(byte[] body, string routingKey, CancellationToken ct)
        {
            var json = Encoding.UTF8.GetString(body);

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<BillingDbContext>();

            if (routingKey == "stock.reserved")
            {
                var evt = JsonSerializer.Deserialize<StockReservedEvent>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                          ?? throw new InvalidOperationException("Failed to deserialize StockReservedEvent.");

                var bill = await db.Bills.FirstOrDefaultAsync(b => b.Id == evt.BillId, ct);
                if (bill != null)
                {
                    // No longer resetting status to Pending here.
                    // The bill starts as Pending during creation and stays that way until StartPayment is called.
                    // This prevents the "Late Event" from reverting the AwaitingPayment status.
                    await db.SaveChangesAsync(ct);
                }
            }
            else if (routingKey == "stock.failed")
            {
                var evt = JsonSerializer.Deserialize<StockFailedEvent>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                          ?? throw new InvalidOperationException("Failed to deserialize StockFailedEvent.");

                var bill = await db.Bills.FirstOrDefaultAsync(b => b.Id == evt.BillId, ct);
                if (bill != null)
                {
                    bill.Status = BillStatus.Cancelled; // Use cancelled for failure
                    await db.SaveChangesAsync(ct);
                }
            }
        }
    }
}
