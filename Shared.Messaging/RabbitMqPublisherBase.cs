using Microsoft.Extensions.Configuration;
using RabbitMQ.Client;
using System;
using System.Text;
using System.Text.Json;

namespace Shared.Messaging.RabbitMq
{
    public class RabbitMqPublisherBase : IDisposable
    {
        private readonly ConnectionFactory _factory;
        private IConnection? _connection;
        private readonly string _exchange;
        private readonly string _exchangeType;

        public RabbitMqPublisherBase(IConfiguration config)
        {
            _factory = new ConnectionFactory
            {
                HostName = config["RabbitMQ:Host"],
                UserName = config["RabbitMQ:Username"],
                Password = config["RabbitMQ:Password"],
                RequestedConnectionTimeout = TimeSpan.FromSeconds(5)
            };

            _exchange = config["RabbitMQ:Exchange"] ?? "app.exchange";
            _exchangeType = config["RabbitMQ:ExchangeType"] ?? "topic";
        }

        public void Publish<T>(T message, string routingKey)
        {
            _connection ??= _factory.CreateConnection();
            using var channel = _connection.CreateModel();

            channel.ExchangeDeclare(exchange: _exchange, type: _exchangeType, durable: true);

            var body = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(message));
            var props = channel.CreateBasicProperties();
            props.ContentType = "application/json";
            props.DeliveryMode = 2;

            channel.BasicPublish(exchange: _exchange, routingKey: routingKey, basicProperties: props, body: body);
        }

        public void Dispose()
        {
            try { _connection?.Close(); } catch { }
            _connection?.Dispose();
        }
    }
}

