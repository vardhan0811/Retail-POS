using System.ComponentModel.DataAnnotations;

namespace ProductService.DTOs
{
    public class CreateTaxRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal Percentage { get; set; }
    }

    public class UpdateTaxRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal Percentage { get; set; }
    }
}
