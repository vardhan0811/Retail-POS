namespace BillingService.Services
{
    public interface IProductClient
    {
        Task<ProductDto> GetProductById(Guid productId);
        Task IncreaseStockAsync(Guid productId, int quantity);
        Task FinalizeStockAsync(Guid storeId, List<(Guid ProductId, int Quantity)> items);
    }

    public class ProductDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal MRP { get; set; }
        public decimal SellingPrice { get; set; }
        public decimal TaxPercentage { get; set; }
        public bool IsRefundable { get; set; }
        public int RefundWindowHours { get; set; }
        public string? ImageUrl { get; set; }
    }
}

