using System;
using System.ComponentModel.DataAnnotations;

namespace ProductService.DTOs
{
    public class UpdateProductRequest
    {
        [MaxLength(100)]
        public string? Name { get; set; }

        [MaxLength(50)]
        public string? SKU { get; set; }

        public string? Barcode { get; set; }
        public string? ImageUrl { get; set; }

        public Guid? CategoryId { get; set; }

        public Guid? TaxId { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "MRP must be positive")]
        public decimal? MRP { get; set; }

        [Range(0.01, double.MaxValue, ErrorMessage = "SellingPrice must be positive")]
        public decimal? SellingPrice { get; set; }

        public bool? IsActive { get; set; }
        public bool? IsRefundable { get; set; }
        public int? RefundWindowHours { get; set; }
    }
}
