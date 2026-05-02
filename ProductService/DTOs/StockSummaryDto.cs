namespace ProductService.DTOs
{
    public class StockSummaryDto
    {
        public int Total { get; set; }
        public int Low { get; set; }
        public int OutOfStock { get; set; }
    }
}
