using BillingService.Entities;
using BillingService.DTOs;

namespace BillingService.Repositories
{
    public interface IBillingRepository
    {
        Task AddAsync(Bill bill);
        Task<Bill?> GetByIdAsync(Guid id);
        Task<Bill?> GetByIdNoTrackingAsync(Guid id);
        Task<IEnumerable<Bill>> GetAllAsync();
        IQueryable<Bill> GetAllQuery();
        IQueryable<RefundRequest> GetAllRefundRequestsQuery();
        Task<IEnumerable<Bill>> GetByStatusAsync(BillStatus status);
        Task<IEnumerable<Bill>> GetByUserAsync(Guid userId);
        Task<IEnumerable<Bill>> GetByDateRangeAsync(DateTime start, DateTime end);
        Task<IEnumerable<Bill>> GetTodayAsync();
        Task<decimal> GetTotalRevenueAsync();
        Task UpdateAsync(Bill bill);
        Task<IEnumerable<Bill>> GetByStoreAsync(Guid storeId);
        Task<IEnumerable<Bill>> GetByUserDateRangeAsync(Guid userId, DateTime start, DateTime end);
        Task<IEnumerable<Bill>> GetByStoreDateRangeAsync(Guid storeId, DateTime start, DateTime end);
        Task<Bill?> GetByNumberAsync(string billNumber);
        Task<IEnumerable<Bill>> SearchAsync(string numberOrReference);
        Task<decimal> GetStoreRevenueAsync(Guid storeId);
        Task<IEnumerable<TopCustomerDto>> GetTopCustomersAsync(Guid storeId, int count);
        Task<IEnumerable<TopProductDto>> GetTopProductsAsync(Guid storeId, int count);
        Task RefundAsync(Guid billId);
        Task AddPaymentAsync(Payment payment);
        Task<IEnumerable<Payment>> GetPaymentsByBillIdAsync(Guid billId);
        Task<Payment?> GetPaymentByIdAsync(Guid paymentId);
        Task<Payment?> GetSuccessfulPaymentByBillIdAsync(Guid billId);
        Task<(IReadOnlyList<Bill>, int)> GetPagedAsync(int page, int pageSize, string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? sortBy, string? search);
        Task<SalesSummaryDto> GetSalesSummaryAsync(string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? search);
        Task AddRefundRequestAsync(RefundRequest request);
        Task<RefundRequest?> GetRefundRequestByIdAsync(Guid id);
        Task UpdateRefundRequestAsync(RefundRequest request);
        Task<IEnumerable<RefundRequest>> GetRefundRequestsV2Async(Guid? storeId, RefundStatus? status);
        Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync();
        Task<string> ExportCsvAsync();
        Task AddAuditLogAsync(BillAuditLog auditLog);
        Task<IdempotencyRecord?> GetIdempotencyRecordAsync(string id);
        Task AddIdempotencyRecordAsync(IdempotencyRecord record);
    }
}
