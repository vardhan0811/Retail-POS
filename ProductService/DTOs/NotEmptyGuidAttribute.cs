using System.ComponentModel.DataAnnotations;

namespace ProductService.DTOs
{
    [System.AttributeUsage(System.AttributeTargets.Property | System.AttributeTargets.Field | System.AttributeTargets.Parameter)]
    public sealed class NotEmptyGuidAttribute : ValidationAttribute
    {
        public override bool IsValid(object? value)
        {
            return value is Guid guid && guid != Guid.Empty;
        }
    }
}
