using System;
using System.ComponentModel.DataAnnotations;

namespace ProductService.DTOs
{
    public class InventoryUpdateRequest
    {
        [Required]
        public Guid ProductId { get; set; }

        [Required]
        public int Change { get; set; }

        [Required]
        public Guid StoreId { get; set; }
    }
}
