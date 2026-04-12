using System.ComponentModel.DataAnnotations;

namespace AdminService.DTOs
{
    public class CategoryViewDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Guid StoreId { get; set; }
        public bool IsActive { get; set; }
    }

    public class TaxViewDto
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public decimal Percentage { get; set; }
    }

    public class CreateCategoryAdminRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }

    public class UpdateCategoryAdminRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;
    }

    public class CreateTaxAdminRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal Percentage { get; set; }
    }

    public class UpdateTaxAdminRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Range(0, 100)]
        public decimal Percentage { get; set; }
    }
}
