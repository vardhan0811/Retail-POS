using BillingService.DTOs;
using BillingService.Entities;

namespace BillingService.Services
{
    public interface IBillingService
    {
        Task<BillDto> CreateBillAsync(Guid userId, Guid storeId, List<BillItemRequest> items);
        Task<BillDto> StartPaymentAsync(Guid billId);
        Task<BillDto> GetByIdAsync(Guid id);
        Task<IReadOnlyList<BillDto>> GetAllAsync();
        Task<IReadOnlyList<BillDto>> GetByStatusAsync(BillStatus status);
        Task<IReadOnlyList<BillDto>> GetByUserAsync(Guid userId);
        Task<IReadOnlyList<BillDto>> GetByDateRangeAsync(DateTime start, DateTime end);
        Task<IReadOnlyList<BillDto>> GetTodayAsync();
        Task<decimal> GetTotalRevenueAsync();
        Task<IReadOnlyList<BillDto>> GetByStoreAsync(Guid storeId);
        Task<IReadOnlyList<BillDto>> GetByUserDateRangeAsync(Guid userId, DateTime start, DateTime end);
        Task<IReadOnlyList<BillDto>> GetByStoreDateRangeAsync(Guid storeId, DateTime start, DateTime end);
        Task<BillDto> GetByNumberAsync(string billNumber);
        Task<IReadOnlyList<BillDto>> SearchAsync(string numberOrReference);
        Task<decimal> GetStoreRevenueAsync(Guid storeId);
        Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(Guid storeId, int count);
        Task<IReadOnlyList<TopProductDto>> GetTopProductsAsync(Guid storeId, int count);
        Task HoldAsync(Guid billId);
        Task ResumeAsync(Guid billId);
        Task CancelAsync(Guid billId);
        Task FinalizeAsync(Guid billId, Guid paymentId);
        Task<PaymentDto> CreatePaymentAsync(CreatePaymentRequest request);
        Task<IEnumerable<PaymentDto>> GetPaymentsByBillIdAsync(Guid billId);
        Task RefundAsync(Guid billId);
        Task ApproveRefundAsync(Guid billId);
        Task RejectRefundAsync(Guid billId);
        Task<PagedResult<BillDto>> GetPagedAsync(int page, int pageSize, string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? sortBy, string? search);
        Task<ReceiptDto> GetReceiptAsync(Guid billId, Guid storeId);
        Task<string> ExportCsvAsync();
    }
}
