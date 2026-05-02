using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProductService.Entities
{
    public class ProductStock
    {
        public Guid ProductId { get; set; }
        public Product Product { get; set; } = null!;

        public Guid StoreId { get; set; }

        public int Quantity { get; set; }
        public int ReservedQuantity { get; set; }

        [NotMapped]
        public int AvailableQuantity => Math.Max(0, Quantity - ReservedQuantity);

        [Timestamp]
        public byte[] RowVersion { get; set; } = Array.Empty<byte>();

        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
        public string LastUpdatedBy { get; set; } = "System";
    }
}
