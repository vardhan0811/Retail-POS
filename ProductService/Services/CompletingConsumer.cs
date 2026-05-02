using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using ProductService.Data;
using ProductService.Entities;
using Shared.Contracts.Events;
using Shared.Messaging.RabbitMq;
using System;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ProductService.Services
{
    /// <summary>
    /// Dedicated consumer for bill.completed events.
    /// Deducts physical stock AND releases the reservation for the affected store.
    /// </summary>
    public sealed class CompletingConsumer : Shared.Messaging.RabbitMq.RabbitMqConsumerBase
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public CompletingConsumer(
            IConfiguration config,
            ILogger<CompletingConsumer> logger,
            IServiceScopeFactory scopeFactory)
            : base(config, logger, queueName: "product.bill.completed", routingKeys: "bill.completed")
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ProcessMessageAsync(byte[] body, string routingKey, CancellationToken ct)
        {
            var json = Encoding.UTF8.GetString(body);
            var e = JsonSerializer.Deserialize<BillCompletedEvent>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Failed to deserialize BillCompletedEvent.");

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ProductDbContext>();

            if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == e.MessageId, ct)) return;

            var productIds = e.Items.Select(i => i.ProductId).Distinct().ToList();

            // Stock now lives in ProductStock (store-aware) — NOT in Product.
            var stockRows = await db.ProductStocks
                .Where(ps => productIds.Contains(ps.ProductId) && ps.StoreId == e.StoreId)
                .ToDictionaryAsync(ps => ps.ProductId, ct);

            foreach (var item in e.Items)
            {
                if (stockRows.TryGetValue(item.ProductId, out var row))
                {
                    row.Quantity -= item.Quantity;
                    row.ReservedQuantity = Math.Max(0, row.ReservedQuantity - item.Quantity);
                    row.UpdatedAt = DateTime.UtcNow;
                }
            }

            db.ProcessedMessages.Add(new ProcessedMessage
            {
                Id = Guid.NewGuid(),
                MessageId = e.MessageId,
                ProcessedAt = DateTime.UtcNow
            });
            await db.SaveChangesAsync(ct);
        }
    }
}