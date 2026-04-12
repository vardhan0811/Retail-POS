namespace BillingService.Services
{
    public interface IProductClient
    {
        Task<ProductDto> GetProductById(Guid productId);
        Task IncreaseStockAsync(Guid productId, int quantity);
    }

    public class ProductDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal MRP { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal TaxPercentage { get; set; }
    }
}
