using System.Threading.Tasks;
using BillingService.DTOs;

namespace BillingService.Services
{
    public interface IPdfService
    {
        Task<byte[]> GenerateInvoicePdfAsync(ReceiptDto receipt);
    }
}
