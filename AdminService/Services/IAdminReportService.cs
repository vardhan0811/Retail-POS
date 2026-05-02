using AdminService.DTOs;
using AdminService.Entities;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace AdminService.Services
{
    public interface IAdminReportService
    {
        // Legacy (precomputed)
        Task<AdminReport?> GetByIdAsync(Guid id);
        Task<IEnumerable<AdminReport>> GetAllAsync();
        Task AddAsync(AdminReport report);
        Task<IEnumerable<AdminReport>> GetByTypeAsync(string reportType);
        Task<ReportDataDto?> GetStoreSummaryAsync(Guid? storeId, DateTime date);

        // BI Live Endpoints
        Task<KpiSummaryDto>        GetKpiSummaryAsync(ReportFilter filter, string bearerToken);
        Task<List<SalesTrendPointDto>> GetSalesTrendAsync(ReportFilter filter, string bearerToken);
        Task<RefundAnalyticsDto>   GetRefundAnalyticsAsync(ReportFilter filter, string bearerToken);
        Task<List<PaymentMethodDto>>  GetPaymentBreakdownAsync(ReportFilter filter, string bearerToken);
        Task<List<ProductMetricDto>>  GetTopProductsAsync(ReportFilter filter, string bearerToken, int count = 10);
        Task<string>               ExportCsvAsync(ReportFilter filter, string bearerToken);
    }
}
