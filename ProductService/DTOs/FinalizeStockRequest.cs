using System;
using System.Collections.Generic;

namespace ProductService.DTOs
{
    public class FinalizeStockRequest
    {
        public Guid StoreId { get; set; }
        public List<FinalizeStockItem> Items { get; set; } = new();
    }

    public class FinalizeStockItem
    {
        public Guid ProductId { get; set; }
        public int Quantity { get; set; }
    }
}
