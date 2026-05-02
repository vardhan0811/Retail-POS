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
        Task HoldAsync(Guid billId, Guid userId);
        Task ResumeAsync(Guid billId, Guid userId, string role);
        Task CancelAsync(Guid billId, Guid userId, string role);
        Task FinalizeAsync(Guid billId, Guid paymentId);
        Task<PaymentDto> CreatePaymentAsync(CreatePaymentRequest request);
        Task<IEnumerable<PaymentDto>> GetPaymentsByBillIdAsync(Guid billId);
        Task<RefundRequestDto> RequestRefundV2Async(RefundProcessRequest request);
        Task<RefundRequestDto> ApproveRefundV2Async(Guid requestId);
        Task<RefundRequestDto> RejectRefundV2Async(Guid requestId, string reason);
        Task<RefundRequestDto> SettleRefundV2Async(Guid requestId);
        Task<IEnumerable<RefundRequestDto>> GetRefundRequestsV2Async(Guid? storeId = null, RefundStatus? status = null);
        Task<PagedResult<BillDto>> GetPagedAsync(int page, int pageSize, string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? sortBy, string? search);
        Task<SalesSummaryDto> GetSalesSummaryAsync(string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? search);
        Task<ReceiptDto> GetReceiptAsync(Guid billId, Guid storeId);
        Task<byte[]> GetPdfReceiptAsync(ReceiptDto receipt);
        Task<SalesDashboardSummaryDto> GetDashboardSummaryAsync(Guid? storeId = null);
        Task<OperatorSummaryDto> GetOperatorSummaryAsync(Guid userId);
        Task<string> ExportCsvAsync();
        Task SendReceiptEmailAsync(Guid billId, string email, Guid storeId);

        // ─── BI Reports (Live Aggregation) ──────────────────────────────────
        Task<BillingSalesSummaryDto> GetSalesSummaryBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status);
        Task<List<SalesTrendPointDto>> GetSalesTrendBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status, string granularity);
        Task<RefundAnalyticsDto> GetRefundAnalyticsBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status);
        Task<List<PaymentMethodDto>> GetPaymentBreakdownBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status);
        Task<List<ProductMetricDto>> GetTopProductsBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status, int count);
    }
}
