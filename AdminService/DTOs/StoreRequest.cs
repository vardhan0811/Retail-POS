using System.ComponentModel.DataAnnotations;

namespace AdminService.DTOs
{
    public class CreateStoreRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [MaxLength(300)]
        public string Address { get; set; } = string.Empty;
    }

    public class UpdateStoreRequest
    {
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        [Required]
        [MaxLength(200)]
        public string Location { get; set; } = string.Empty;

        [MaxLength(300)]
        public string Address { get; set; } = string.Empty;

        public bool IsActive { get; set; }
    }
}
