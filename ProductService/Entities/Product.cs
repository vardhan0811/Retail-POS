namespace ProductService.Entities
{
    public class Product
    {
        public Guid Id { get; set; }                              // Primary key

        public string Name { get; set; } = string.Empty;          // Product name
        public string SKU { get; set; } = string.Empty;           // Unique stock identifier
        public string Barcode { get; set; } = string.Empty;       // Scan-based lookup
        public string? ImageUrl { get; set; }                     // External image link

        public Guid CategoryId { get; set; }                       // FK → Category
        public Category Category { get; set; } = null!;
        public Guid TaxId { get; set; }                            // FK → Tax

        [System.ComponentModel.DataAnnotations.Timestamp]
        public byte[] RowVersion { get; set; } = System.Array.Empty<byte>();

        public decimal MRP { get; set; }                           // Maximum retail price
        public decimal SellingPrice { get; set; }                 // Actual selling price

        public bool IsActive { get; set; }                        // Soft delete
        public bool IsRefundable { get; set; } = true;            // Refund eligibility
        public int RefundWindowHours { get; set; } = 24;          // Default 24 hours

        public TaxConfiguration Tax { get; set; } = null!;        // Navigation property

        [System.ComponentModel.DataAnnotations.Schema.NotMapped]
        public decimal TaxPercentage => Tax?.Percentage ?? 0;

        public int Stock { get; set; }                           // Physical stock available
        public int ReservedStock { get; set; }                   // Stock held for orders
        public int TotalSoldQuantity { get; set; }                // Cumulative sales
        public Guid StoreId { get; set; }                        // Scoping store

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string UpdatedBy { get; set; } = "System";
    }
}