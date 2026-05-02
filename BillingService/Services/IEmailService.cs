using System.Threading.Tasks;

namespace BillingService.Services
{
    public interface IEmailService
    {
        Task SendEmailWithAttachmentAsync(string to, string subject, string body, byte[] attachment, string fileName);
    }
}
