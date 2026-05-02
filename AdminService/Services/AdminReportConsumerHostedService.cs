using AdminService.Data;
using AdminService.DTOs;
using AdminService.Entities;
using AdminService.Repositories;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Events;
using Shared.Messaging.RabbitMq;
using System.Text;
using System.Text.Json;

namespace AdminService.Services
{
    public sealed class AdminReportConsumerHostedService : RabbitMqConsumerBase
    {
        private readonly IServiceScopeFactory _scopeFactory;
        private const string DailySummaryType = "DAILY_SUMMARY";

        public AdminReportConsumerHostedService(
            IConfiguration config,
            ILogger<AdminReportConsumerHostedService> logger,
            IServiceScopeFactory scopeFactory)
            : base(config, logger, "admin.report.events", "bill.completed", "bill.cancelled")
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ProcessMessageAsync(byte[] body, string routingKey, CancellationToken ct)
        {
            var json = Encoding.UTF8.GetString(body);
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var repo = scope.ServiceProvider.GetRequiredService<IAdminReportRepository>();

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            if (routingKey.Equals("bill.completed", StringComparison.OrdinalIgnoreCase))
            {
                var evt = JsonSerializer.Deserialize<BillCompletedEvent>(json, options)
                    ?? throw new InvalidOperationException("Failed to deserialize BillCompletedEvent");

                if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == evt.MessageId, ct))
                    return;

                await AggregateBillCompleted(repo, evt);
                await MarkProcessedAsync(db, evt.MessageId, ct);
            }
            else if (routingKey.Equals("bill.cancelled", StringComparison.OrdinalIgnoreCase))
            {
                var evt = JsonSerializer.Deserialize<BillCancelledEvent>(json, options)
                    ?? throw new InvalidOperationException("Failed to deserialize BillCancelledEvent");

                if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == evt.MessageId, ct))
                    return;

                await AggregateBillCancelled(repo, evt);
                await MarkProcessedAsync(db, evt.MessageId, ct);
            }
        }

        private async Task AggregateBillCompleted(IAdminReportRepository repo, BillCompletedEvent evt)
        {
            var report = await repo.GetReportAsync(DailySummaryType, evt.StoreId, DateTime.UtcNow);
            var data = report != null 
                ? JsonSerializer.Deserialize<ReportDataDto>(report.Data) ?? new ReportDataDto()
                : new ReportDataDto();

            // Update Financials
            data.TotalSales += evt.TotalAmount;
            data.TotalOrders += 1;
            data.TaxCollected += evt.TaxAmount;
            data.AvgTicket = data.TotalOrders > 0 ? data.TotalSales / data.TotalOrders : 0;

            // Update Top Products
            foreach (var item in evt.Items)
            {
                var existing = data.TopProducts.FirstOrDefault(p => p.ProductId == item.ProductId);
                if (existing != null)
                {
                    existing.TotalQuantity += item.Quantity;
                    existing.TotalRevenue += item.UnitPrice * item.Quantity;
                    existing.ProductName = item.ProductName; // Update name if changed
                }
                else
                {
                    data.TopProducts.Add(new ProductMetricDto
                    {
                        ProductId = item.ProductId,
                        ProductName = item.ProductName,
                        TotalQuantity = item.Quantity,
                        TotalRevenue = item.UnitPrice * item.Quantity
                    });
                }
            }

            // Keep Top 10 by quantity
            data.TopProducts = data.TopProducts
                .OrderByDescending(p => p.TotalQuantity)
                .Take(10)
                .ToList();

            if (report == null)
            {
                report = new AdminReport
                {
                    Id = Guid.NewGuid(),
                    StoreId = evt.StoreId,
                    ReportType = DailySummaryType,
                    CreatedAt = DateTime.UtcNow,
                    Data = JsonSerializer.Serialize(data)
                };
                await repo.AddAsync(report);
            }
            else
            {
                report.Data = JsonSerializer.Serialize(data);
                await repo.UpdateAsync(report);
            }
        }

        private async Task AggregateBillCancelled(IAdminReportRepository repo, BillCancelledEvent evt)
        {
            var report = await repo.GetReportAsync(DailySummaryType, evt.StoreId, DateTime.UtcNow);
            if (report == null) return; // Nothing to cancel if no report for today

            var data = JsonSerializer.Deserialize<ReportDataDto>(report.Data) ?? new ReportDataDto();

            // Reverse Financials
            data.TotalSales -= evt.TotalAmount;
            data.TotalOrders -= 1;
            data.TaxCollected -= evt.TaxAmount;
            data.AvgTicket = data.TotalOrders > 0 ? data.TotalSales / data.TotalOrders : 0;

            // Reverse Top Products (best effort)
            foreach (var item in evt.Items)
            {
                var existing = data.TopProducts.FirstOrDefault(p => p.ProductId == item.ProductId);
                if (existing != null)
                {
                    existing.TotalQuantity -= item.Quantity;
                    existing.TotalRevenue -= item.UnitPrice * item.Quantity;
                }
            }

            // Cleanup & Resort
            data.TopProducts = data.TopProducts
                .Where(p => p.TotalQuantity > 0)
                .OrderByDescending(p => p.TotalQuantity)
                .Take(10)
                .ToList();

            report.Data = JsonSerializer.Serialize(data);
            await repo.UpdateAsync(report);
        }

        private static async Task MarkProcessedAsync(AdminDbContext db, Guid messageId, CancellationToken ct)
        {
            db.ProcessedMessages.Add(new ProcessedMessage
            {
                Id = Guid.NewGuid(),
                MessageId = messageId,
                ProcessedAt = DateTime.UtcNow
            });

            try
            {
                await db.SaveChangesAsync(ct);
            }
            catch (DbUpdateException)
            {
                // Duplicate; safe to ignore.
            }
        }
    }
}
