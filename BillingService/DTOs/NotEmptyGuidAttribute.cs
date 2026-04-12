using System.ComponentModel.DataAnnotations;

namespace BillingService.DTOs
{
    [System.AttributeUsage(System.AttributeTargets.Property | System.AttributeTargets.Field | System.AttributeTargets.Parameter)]
    public sealed class NotEmptyGuidAttribute : ValidationAttribute
    {
        public NotEmptyGuidAttribute()
        {
            ErrorMessage = "Guid value is required";
        }

        public override bool IsValid(object? value)
        {
            if (value is Guid guid)
                return guid != Guid.Empty;

            return false;
        }
    }
}
