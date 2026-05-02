using global::ProductService.Models;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace ProductService.Services
{
    public class RabbitMqPublisher
    {
        public void Publish(ProductMessage message)
        {
            var factory = new ConnectionFactory() { HostName = "localhost" };

            using var connection = factory.CreateConnection();
            using var channel = connection.CreateModel();

            channel.QueueDeclare("product-queue", false, false, false);

            var json = JsonSerializer.Serialize(message);
            var body = Encoding.UTF8.GetBytes(json);

            channel.BasicPublish("", "product-queue", null, body);
        }

        public void Publish(global::CartService.Models.CartMessage cart)
        {
            throw new NotImplementedException();
        }
    }
}
