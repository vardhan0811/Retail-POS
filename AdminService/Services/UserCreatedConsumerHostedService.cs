using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using AdminService.Data;
using AdminService.Entities;
using Shared.Contracts.Events;
using System;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Shared.Messaging.RabbitMq;

namespace AdminService.Services
{
    public sealed class UserCreatedConsumerHostedService : RabbitMqConsumerBase
    {
        private readonly IServiceScopeFactory _scopeFactory;

        public UserCreatedConsumerHostedService(
            IConfiguration config,
            ILogger<UserCreatedConsumerHostedService> logger,
            IServiceScopeFactory scopeFactory)
            : base(config, logger, "admin.user.events", "user.created", "user.role.updated", "user.status.updated")
        {
            _scopeFactory = scopeFactory;
        }

        protected override async Task ProcessMessageAsync(byte[] body, string routingKey, CancellationToken ct)
        {
            var json = Encoding.UTF8.GetString(body);

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AdminDbContext>();
            var userService = scope.ServiceProvider.GetRequiredService<IUserService>();

            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            if (string.Equals(routingKey, "user.created", StringComparison.OrdinalIgnoreCase))
            {
                var evt = JsonSerializer.Deserialize<UserCreatedEvent>(json, options)
                    ?? throw new InvalidOperationException("Failed to deserialize UserCreatedEvent.");
                if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == evt.MessageId, ct))
                    return;

                await userService.HandleUserCreatedEventAsync(evt);
                await MarkProcessedAsync(db, evt.MessageId, ct);
                return;
            }

            if (string.Equals(routingKey, "user.role.updated", StringComparison.OrdinalIgnoreCase))
            {
                var evt = JsonSerializer.Deserialize<UserRoleUpdatedEvent>(json, options)
                    ?? throw new InvalidOperationException("Failed to deserialize UserRoleUpdatedEvent.");
                if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == evt.MessageId, ct))
                    return;

                await userService.HandleUserRoleUpdatedEventAsync(evt);
                await MarkProcessedAsync(db, evt.MessageId, ct);
                return;
            }

            if (string.Equals(routingKey, "user.status.updated", StringComparison.OrdinalIgnoreCase))
            {
                var evt = JsonSerializer.Deserialize<UserStatusUpdatedEvent>(json, options)
                    ?? throw new InvalidOperationException("Failed to deserialize UserStatusUpdatedEvent.");
                if (await db.ProcessedMessages.AnyAsync(pm => pm.MessageId == evt.MessageId, ct))
                    return;

                await userService.HandleUserStatusUpdatedEventAsync(evt);
                await MarkProcessedAsync(db, evt.MessageId, ct);
                return;
            }

            throw new InvalidOperationException($"Unsupported routing key: {routingKey}");
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
                // Duplicate message; safe to ignore.
            }
        }
    }
}
