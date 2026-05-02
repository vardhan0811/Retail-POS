using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using ProductService.Data;
using ProductService.Entities;
using Shared.Contracts.Events;
using Shared.Messaging.RabbitMq;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ProductService.Services
{
    public sealed class RabbitMqConsumerHostedService : Shared.Messaging.RabbitMq.RabbitMqConsumerBase
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private readonly ILogger<RabbitMqConsumerHostedService> _logger;

        public RabbitMqConsumerHostedService(
            IConfiguration config,
            ILogger<RabbitMqConsumerHostedService> logger,
            IServiceScopeFactory scopeFactory)
            : base(config, logger, queueName: "product.bill.events", routingKeys: new[] { "bill.created", "bill.completed", "bill.cancelled" })
        {
            _scopeFactory = scopeFactory;
            _logger = logger;
        }

        protected override async Task ProcessMessageAsync(byte[] body, string routingKey, CancellationToken ct)
        {
            var json = Encoding.UTF8.GetString(body);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ProductDbContext>();
            var publisher = scope.ServiceProvider.GetRequiredService<Shared.Messaging.RabbitMq.RabbitMqPublisherBase>();
            var cache = scope.ServiceProvider.GetRequiredService<IMemoryCache>();

            if (routingKey == "bill.created")
                await HandleBillCreated(json, db, publisher, cache, ct);
            else if (routingKey == "bill.completed")
                await HandleBillCompleted(json, db, cache, ct);
            else if (routingKey == "bill.cancelled")
                await HandleBillCancelled(json, db, cache, ct);
        }

        // ── bill.created ─────────────────────────────────────────────────────────
        // Reserve stock in the Product entity.
        private async Task HandleBillCreated(string json, ProductDbContext db,
            Shared.Messaging.RabbitMq.RabbitMqPublisherBase publisher, IMemoryCache cache, CancellationToken ct)
        {
            var billEvent = JsonSerializer.Deserialize<BillCreatedEvent>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Failed to deserialize BillCreatedEvent.");

            if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == billEvent.MessageId, ct)) return;

            int retryCount = 0;
            const int maxRetries = 5;

            while (true)
            {
                try
                {
                    using var transaction = await db.Database.BeginTransactionAsync(ct);
                    
                    var productIds = billEvent.Items.Select(i => i.ProductId).ToList();
                    var products = await db.Products
                        .Where(p => productIds.Contains(p.Id) && p.StoreId == billEvent.StoreId)
                        .ToDictionaryAsync(p => p.Id, ct);

                    foreach (var item in billEvent.Items)
                    {
                        if (!products.TryGetValue(item.ProductId, out var product) ||
                            (product.Stock - product.ReservedStock) < item.Quantity)
                        {
                            publisher.Publish(new StockFailedEvent
                            {
                                MessageId = Guid.NewGuid(),
                                CorrelationId = billEvent.CorrelationId,
                                BillId = billEvent.BillId,
                                Reason = product == null ? "Product not found" : "Insufficient stock"
                            }, "stock.failed");

                            db.ProcessedMessages.Add(new ProcessedMessage
                            {
                                Id = Guid.NewGuid(),
                                MessageId = billEvent.MessageId,
                                ProcessedAt = DateTime.UtcNow
                            });
                            await db.SaveChangesAsync(ct);
                            await transaction.CommitAsync(ct);
                            return;
                        }

                        product.ReservedStock += item.Quantity;
                    }

                    db.ProcessedMessages.Add(new ProcessedMessage
                    {
                        Id = Guid.NewGuid(),
                        MessageId = billEvent.MessageId,
                        ProcessedAt = DateTime.UtcNow
                    });

                    await db.SaveChangesAsync(ct);
                    await transaction.CommitAsync(ct);
                    
                    productIds.ForEach(id => cache.Remove($"product_{id}"));
                    break; // Success
                }
                catch (DbUpdateConcurrencyException)
                {
                    retryCount++;
                    if (retryCount >= maxRetries) throw;
                    await Task.Delay(100, ct);
                    // EF caches entities, so we need to clear or re-fetch. 
                    // Best to dispose scope or use a fresh context, but since this is a loop 
                    // we'll rely on the re-fetch logic in the next iteration.
                    db.ChangeTracker.Clear();
                }
            }

            publisher.Publish(new StockReservedEvent
            {
                MessageId = Guid.NewGuid(),
                CorrelationId = billEvent.CorrelationId,
                BillId = billEvent.BillId
            }, "stock.reserved");
        }

        // ── bill.completed ───────────────────────────────────────────────────────
        // Deduct physical stock, update total sold, and release the reservation.
        private async Task HandleBillCompleted(string json, ProductDbContext db,
            IMemoryCache cache, CancellationToken ct)
        {
            var billEvent = JsonSerializer.Deserialize<BillCompletedEvent>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Failed to deserialize BillCompletedEvent.");

            if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == billEvent.MessageId, ct)) return;

            int retryCount = 0;
            const int maxRetries = 5;

            while (true)
            {
                try
                {
                    using var transaction = await db.Database.BeginTransactionAsync(ct);

                    var productIds = billEvent.Items.Select(i => i.ProductId).ToList();
                    var products = await db.Products
                        .Where(p => productIds.Contains(p.Id) && p.StoreId == billEvent.StoreId)
                        .ToDictionaryAsync(p => p.Id, ct);

                    foreach (var item in billEvent.Items)
                    {
                        if (products.TryGetValue(item.ProductId, out var product))
                        {
                            product.Stock -= item.Quantity;
                            product.TotalSoldQuantity += item.Quantity;
                            product.ReservedStock = Math.Max(0, product.ReservedStock - item.Quantity);
                        }
                        else
                        {
                            _logger.LogWarning("HandleBillCompleted: Product {ProductId} not found in Store {StoreId} for Bill {BillId}", 
                                item.ProductId, billEvent.StoreId, billEvent.BillId);
                        }
                    }

                    db.ProcessedMessages.Add(new ProcessedMessage
                    {
                        Id = Guid.NewGuid(),
                        MessageId = billEvent.MessageId,
                        ProcessedAt = DateTime.UtcNow
                    });

                    await db.SaveChangesAsync(ct);
                    await transaction.CommitAsync(ct);
                    
                    productIds.ForEach(id => cache.Remove($"product_{id}"));
                    break; // Success
                }
                catch (DbUpdateConcurrencyException)
                {
                    retryCount++;
                    if (retryCount >= maxRetries) throw;
                    await Task.Delay(100, ct);
                    db.ChangeTracker.Clear();
                }
            }
        }

        // ── bill.cancelled ───────────────────────────────────────────────────────
        // Release the reservation without deducting physical stock.
        private async Task HandleBillCancelled(string json, ProductDbContext db,
            IMemoryCache cache, CancellationToken ct)
        {
            var billEvent = JsonSerializer.Deserialize<BillCancelledEvent>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new InvalidOperationException("Failed to deserialize BillCancelledEvent.");

            if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == billEvent.MessageId, ct)) return;

            int retryCount = 0;
            const int maxRetries = 5;

            while (true)
            {
                try
                {
                    using var transaction = await db.Database.BeginTransactionAsync(ct);

                    var productIds = billEvent.Items.Select(i => i.ProductId).ToList();
                    var products = await db.Products
                        .Where(p => productIds.Contains(p.Id) && p.StoreId == billEvent.StoreId)
                        .ToDictionaryAsync(p => p.Id, ct);

                    foreach (var item in billEvent.Items)
                    {
                        if (products.TryGetValue(item.ProductId, out var product))
                        {
                            product.ReservedStock = Math.Max(0, product.ReservedStock - item.Quantity);
                        }
                    }

                    db.ProcessedMessages.Add(new ProcessedMessage
                    {
                        Id = Guid.NewGuid(),
                        MessageId = billEvent.MessageId,
                        ProcessedAt = DateTime.UtcNow
                    });

                    await db.SaveChangesAsync(ct);
                    await transaction.CommitAsync(ct);
                    
                    productIds.ForEach(id => cache.Remove($"product_{id}"));
                    break;
                }
                catch (DbUpdateConcurrencyException)
                {
                    retryCount++;
                    if (retryCount >= maxRetries) throw;
                    await Task.Delay(100, ct);
                    db.ChangeTracker.Clear();
                }
            }
        }
    }
}