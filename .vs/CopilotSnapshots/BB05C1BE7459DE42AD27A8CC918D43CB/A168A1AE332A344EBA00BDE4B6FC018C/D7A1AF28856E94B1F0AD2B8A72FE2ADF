using System.ComponentModel.DataAnnotations;

namespace ProductService.Entities
{
    public class TaxConfiguration
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;

        [Range(0, 100, ErrorMessage = "Tax percentage must be between 0 and 100")]
        public decimal Percentage { get; set; }
    }
}