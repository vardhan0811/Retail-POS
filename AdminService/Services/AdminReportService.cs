using AdminService.DTOs;
using AdminService.Entities;
using AdminService.Repositories;
using Microsoft.Extensions.Caching.Memory;
using System.Globalization;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

namespace AdminService.Services
{
    public class AdminReportService : IAdminReportService
    {
        private readonly IAdminReportRepository _repo;
        private readonly IHttpClientFactory      _httpClientFactory;
        private readonly IConfiguration          _config;
        private readonly IMemoryCache            _cache;
        private readonly ILogger<AdminReportService> _logger;

        private static readonly TimeSpan CacheDuration = TimeSpan.FromSeconds(45);

        public AdminReportService(
            IAdminReportRepository repo,
            IHttpClientFactory httpClientFactory,
            IConfiguration config,
            IMemoryCache cache,
            ILogger<AdminReportService> logger)
        {
            _repo              = repo;
            _httpClientFactory = httpClientFactory;
            _config            = config;
            _cache             = cache;
            _logger            = logger;
        }

        // ─── Legacy ──────────────────────────────────────────────────────────────
        public async Task<AdminReport?>            GetByIdAsync(Guid id)            => await _repo.GetByIdAsync(id);
        public async Task<IEnumerable<AdminReport>> GetAllAsync()                   => await _repo.GetAllAsync();
        public async Task                          AddAsync(AdminReport report)      => await _repo.AddAsync(report);
        public async Task<IEnumerable<AdminReport>> GetByTypeAsync(string type)     => await _repo.GetByTypeAsync(type);

        public async Task<ReportDataDto?> GetStoreSummaryAsync(Guid? storeId, DateTime date)
        {
            if (storeId.HasValue)
            {
                var report = await _repo.GetReportAsync("DAILY_SUMMARY", storeId.Value, date);
                if (report == null || string.IsNullOrWhiteSpace(report.Data)) return null;
                return JsonSerializer.Deserialize<ReportDataDto>(report.Data,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            }

            var allReports = await _repo.GetByTypeAsync("DAILY_SUMMARY");
            var relevant   = allReports
                .Where(r => r.CreatedAt.Date == date.Date && !string.IsNullOrWhiteSpace(r.Data))
                .ToList();

            if (!relevant.Any()) return new ReportDataDto();

            var aggregate        = new ReportDataDto();
            var productAgg       = new Dictionary<Guid, ProductMetricDto>();
            var jsonOpts         = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };

            foreach (var r in relevant)
            {
                var data = JsonSerializer.Deserialize<ReportDataDto>(r.Data!, jsonOpts);
                if (data == null) continue;
                aggregate.TotalSales   += data.TotalSales;
                aggregate.TaxCollected += data.TaxCollected;
                aggregate.TotalOrders  += data.TotalOrders;
                foreach (var p in data.TopProducts ?? new())
                {
                    if (!productAgg.ContainsKey(p.ProductId))
                        productAgg[p.ProductId] = new ProductMetricDto { ProductId = p.ProductId, ProductName = p.ProductName };
                    productAgg[p.ProductId].TotalQuantity += p.TotalQuantity;
                    productAgg[p.ProductId].TotalRevenue  += p.TotalRevenue;
                }
            }
            aggregate.AvgTicket  = aggregate.TotalOrders > 0 ? aggregate.TotalSales / aggregate.TotalOrders : 0;
            aggregate.TopProducts = productAgg.Values.OrderByDescending(p => p.TotalQuantity).Take(10).ToList();
            return aggregate;
        }

        // ─── Live BI Methods ─────────────────────────────────────────────────────

        public async Task<KpiSummaryDto> GetKpiSummaryAsync(ReportFilter filter, string bearerToken)
        {
            var cacheKey = $"kpi:{BuildCacheKey(filter)}";
            if (_cache.TryGetValue(cacheKey, out KpiSummaryDto? cached) && cached != null)
                return cached;

            var client       = CreateClient(bearerToken);
            var billingUrl   = _config["ServiceUrls:BillingService"]!.TrimEnd('/');
            var qp           = BuildBillingParams(filter);
            var kpi          = new KpiSummaryDto();

            try
            {
                // ── Sales summary ──
                var summaryResp = await client.GetAsync($"{billingUrl}/api/bills/reports/sales-summary?{qp}");
                if (summaryResp.IsSuccessStatusCode)
                {
                    var payload = await summaryResp.Content.ReadFromJsonAsync<ApiResponse<BillingSalesSummaryDto>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    var d = payload?.Data;
                    if (d != null)
                    {
                        kpi.GrossRevenue    = d.TotalRevenue;
                        kpi.TotalOrders     = d.TotalOrders;
                        kpi.TotalTax        = d.TotalTax;
                        kpi.CancelledOrders = d.CancelledOrders;
                        kpi.AvgTicket       = d.TotalOrders > 0 ? d.TotalRevenue / d.TotalOrders : 0;
                    }
                }

                // ── Refund summary ──
                var refundResp = await client.GetAsync($"{billingUrl}/api/bills/reports/refund-summary?{qp}");
                if (refundResp.IsSuccessStatusCode)
                {
                    var payload = await refundResp.Content.ReadFromJsonAsync<ApiResponse<BillingRefundSummaryDto>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    var d = payload?.Data;
                    if (d != null)
                        kpi.RefundAmount = d.TotalRefundAmount;
                }

                kpi.NetRevenue = kpi.GrossRevenue - kpi.RefundAmount;
                kpi.RefundRate = kpi.GrossRevenue > 0
                    ? Math.Round((double)(kpi.RefundAmount / kpi.GrossRevenue) * 100, 2) : 0;
            }
            catch (Exception ex) { _logger.LogError(ex, "GetKpiSummaryAsync failed"); }

            _cache.Set(cacheKey, kpi, CacheDuration);
            return kpi;
        }

        public async Task<List<SalesTrendPointDto>> GetSalesTrendAsync(ReportFilter filter, string bearerToken)
        {
            var cacheKey = $"trend:{BuildCacheKey(filter)}";
            if (_cache.TryGetValue(cacheKey, out List<SalesTrendPointDto>? cached) && cached != null)
                return cached;

            var client     = CreateClient(bearerToken);
            var billingUrl = _config["ServiceUrls:BillingService"]!.TrimEnd('/');
            var granularity = ResolveGranularity(filter);
            var qp          = BuildBillingParams(filter) + $"&granularity={granularity}";
            var result      = new List<SalesTrendPointDto>();

            try
            {
                var resp = await client.GetAsync($"{billingUrl}/api/bills/reports/sales-trend?{qp}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<List<SalesTrendPointDto>>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    result = payload?.Data ?? new();
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "GetSalesTrendAsync failed"); }

            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }

        public async Task<RefundAnalyticsDto> GetRefundAnalyticsAsync(ReportFilter filter, string bearerToken)
        {
            var cacheKey = $"refund:{BuildCacheKey(filter)}";
            if (_cache.TryGetValue(cacheKey, out RefundAnalyticsDto? cached) && cached != null)
                return cached;

            var client     = CreateClient(bearerToken);
            var billingUrl = _config["ServiceUrls:BillingService"]!.TrimEnd('/');
            var qp         = BuildBillingParams(filter);
            var result     = new RefundAnalyticsDto();

            try
            {
                var resp = await client.GetAsync($"{billingUrl}/api/bills/reports/refund-analytics?{qp}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<RefundAnalyticsDto>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    result = payload?.Data ?? result;
                }

                // Compute refund rate from KPI data
                var kpi = await GetKpiSummaryAsync(filter, bearerToken);
                result.RefundRate = kpi.RefundRate;
            }
            catch (Exception ex) { _logger.LogError(ex, "GetRefundAnalyticsAsync failed"); }

            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }

        public async Task<List<PaymentMethodDto>> GetPaymentBreakdownAsync(ReportFilter filter, string bearerToken)
        {
            var cacheKey = $"payment:{BuildCacheKey(filter)}";
            if (_cache.TryGetValue(cacheKey, out List<PaymentMethodDto>? cached) && cached != null)
                return cached;

            var client     = CreateClient(bearerToken);
            var billingUrl = _config["ServiceUrls:BillingService"]!.TrimEnd('/');
            var qp         = BuildBillingParams(filter);
            var result     = new List<PaymentMethodDto>();

            try
            {
                var resp = await client.GetAsync($"{billingUrl}/api/bills/reports/payment-breakdown?{qp}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<List<PaymentMethodDto>>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    result = payload?.Data ?? result;
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "GetPaymentBreakdownAsync failed"); }

            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }

        public async Task<List<ProductMetricDto>> GetTopProductsAsync(ReportFilter filter, string bearerToken, int count = 10)
        {
            var cacheKey = $"top:{BuildCacheKey(filter)}:{count}";
            if (_cache.TryGetValue(cacheKey, out List<ProductMetricDto>? cached) && cached != null)
                return cached;

            var client     = CreateClient(bearerToken);
            var billingUrl = _config["ServiceUrls:BillingService"]!.TrimEnd('/');
            var qp         = BuildBillingParams(filter) + $"&count={count}";
            var result     = new List<ProductMetricDto>();

            try
            {
                var resp = await client.GetAsync($"{billingUrl}/api/bills/reports/top-products?{qp}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<List<ProductMetricDto>>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
                    result = (payload?.Data ?? result)
                        .Select(p => { p.NetQuantitySold = Math.Max(0, p.TotalQuantity - p.RefundCount); return p; })
                        .OrderByDescending(p => p.NetQuantitySold)
                        .ToList();
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "GetTopProductsAsync failed"); }

            _cache.Set(cacheKey, result, CacheDuration);
            return result;
        }

        public async Task<string> ExportCsvAsync(ReportFilter filter, string bearerToken)
        {
            var client     = CreateClient(bearerToken);
            var billingUrl = _config["ServiceUrls:BillingService"]!.TrimEnd('/');
            var qp         = BuildBillingParams(filter) + "&pageSize=5000&page=1";

            var sb = new StringBuilder();
            sb.AppendLine("Bill Number,Date,Store,Items,Amount,Tax,Payment Method,Status");

            try
            {
                var resp = await client.GetAsync($"{billingUrl}/api/bills?{qp}");
                if (resp.IsSuccessStatusCode)
                {
                    var payload = await resp.Content.ReadFromJsonAsync<ApiResponse<PagedResult<BillViewDto>>>(
                        new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                    foreach (var b in payload?.Data?.Items ?? new())
                    {
                        var date = b.CreatedAt.ToString("yyyy-MM-dd HH:mm", CultureInfo.InvariantCulture);
                        var itemsSummary = string.Join(" | ", b.Items.Select(i => $"{i.ProductName}({i.Quantity})"));
                        sb.AppendLine($"\"{b.BillNumber}\",\"{date}\",\"{b.StoreId}\",\"{itemsSummary}\",\"{b.FinalAmount:F2}\",\"{b.TaxAmount:F2}\",\"{b.Status}\"");
                    }
                }
            }
            catch (Exception ex) { _logger.LogError(ex, "ExportCsvAsync failed"); }

            return sb.ToString();
        }

        // ─── Helpers ─────────────────────────────────────────────────────────────

        private HttpClient CreateClient(string bearerToken)
        {
            var client = _httpClientFactory.CreateClient();
            client.Timeout = TimeSpan.FromSeconds(10);
            if (!string.IsNullOrWhiteSpace(bearerToken))
                client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", bearerToken);
            return client;
        }

        private static string BuildBillingParams(ReportFilter f)
        {
            var parts = new List<string>();
            if (f.StartDate.HasValue) parts.Add($"start={f.StartDate.Value:O}");
            if (f.EndDate.HasValue)   parts.Add($"end={f.EndDate.Value:O}");
            if (f.StoreId.HasValue)   parts.Add($"storeId={f.StoreId}");
            if (!string.IsNullOrWhiteSpace(f.Status)) parts.Add($"status={f.Status}");
            return string.Join("&", parts);
        }

        private static string BuildCacheKey(ReportFilter f) =>
            $"{f.StartDate:yyyyMMdd}-{f.EndDate:yyyyMMdd}-{f.StoreId}-{f.Status}";

        private static string ResolveGranularity(ReportFilter f)
        {
            if (!string.IsNullOrWhiteSpace(f.Granularity)) return f.Granularity;
            if (!f.StartDate.HasValue || !f.EndDate.HasValue) return "day";
            var span = f.EndDate.Value - f.StartDate.Value;
            if (span.TotalDays <= 1)   return "hour";
            if (span.TotalDays <= 30)  return "day";
            return "week";
        }

        // ─── Inner DTOs for BillingService responses ─────────────────────────────
        private class BillingSalesSummaryDto
        {
            public decimal TotalRevenue    { get; set; }
            public int     TotalOrders     { get; set; }
            public decimal TotalTax        { get; set; }
            public int     CancelledOrders { get; set; }
            public decimal RefundAmount    { get; set; }
        }

        private class BillingRefundSummaryDto
        {
            public decimal TotalRefundAmount { get; set; }
        }

        private class ApiResponse<T>
        {
            public bool   Success { get; set; }
            public string Message { get; set; } = string.Empty;
            public T?     Data    { get; set; }
        }

        private class PagedResult<T>
        {
            public List<T> Items      { get; set; } = new();
            public int     TotalCount { get; set; }
        }

        private class BillViewDto
        {
            public string   BillNumber  { get; set; } = string.Empty;
            public DateTime CreatedAt   { get; set; }
            public Guid     StoreId     { get; set; }
            public decimal  FinalAmount { get; set; }
            public decimal  TaxAmount   { get; set; }
            public string   Status      { get; set; } = string.Empty;
            public List<BillItemViewDto> Items { get; set; } = new();
        }

        private class BillItemViewDto
        {
            public string ProductName { get; set; } = string.Empty;
            public decimal Quantity { get; set; }
        }
    }
}
