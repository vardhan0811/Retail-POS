using BillingService.Data;
using BillingService.DTOs;
using BillingService.Entities;
using Microsoft.EntityFrameworkCore;

namespace BillingService.Repositories
{
    public class BillingRepository : IBillingRepository
    {
        private readonly BillingDbContext _context;

        public BillingRepository(BillingDbContext context)
        {
            _context = context;
        }

        public async Task AddAsync(Bill bill)
        {
            await _context.Bills.AddAsync(bill);
            await _context.SaveChangesAsync();
        }

        public async Task<Bill?> GetByIdAsync(Guid id)
        {
            return await _context.Bills
                .Include(b => b.Items)
                .Include(b => b.AuditLogs)
                .FirstOrDefaultAsync(b => b.Id == id);
        }

        public async Task<Bill?> GetByIdNoTrackingAsync(Guid id)
        {
            return await _context.Bills
                .AsNoTracking()
                .Include(b => b.Items)
                .Include(b => b.AuditLogs)
                .FirstOrDefaultAsync(b => b.Id == id);
        }

        public async Task<IEnumerable<Bill>> GetAllAsync()
        {
            return await _context.Bills.Include(b => b.Items).ToListAsync();
        }

        public IQueryable<Bill> GetAllQuery()
        {
            return _context.Bills
                .Include(b => b.Items)
                .Include(b => b.AuditLogs)
                .AsQueryable();
        }

        public IQueryable<RefundRequest> GetAllRefundRequestsQuery()
        {
            return _context.RefundRequests
                .Include(r => r.Bill)
                .Include(r => r.Items)
                .AsQueryable();
        }

        public async Task<IEnumerable<Bill>> GetByStatusAsync(BillStatus status)
        {
            return await _context.Bills.Include(b => b.Items).Where(b => b.Status == status).ToListAsync();
        }

        public async Task<IEnumerable<Bill>> GetByUserAsync(Guid userId)
        {
            return await _context.Bills.Include(b => b.Items).Where(b => b.UserId == userId).ToListAsync();
        }

        public async Task<IEnumerable<Bill>> GetByDateRangeAsync(DateTime start, DateTime end)
        {
            return await _context.Bills.Include(b => b.Items).Where(b => b.CreatedAt >= start && b.CreatedAt <= end).ToListAsync();
        }

        public async Task<IEnumerable<Bill>> GetTodayAsync()
        {
            var today = DateTime.UtcNow.Date;
            return await _context.Bills.Include(b => b.Items).Where(b => b.CreatedAt.Date == today).ToListAsync();
        }

        public async Task<decimal> GetTotalRevenueAsync()
        {
            return await _context.Bills
                .Where(b => b.Status == BillStatus.Finalized)
                .SumAsync(b => b.FinalAmount);
        }


        public async Task UpdateAsync(Bill bill)
        {
            _context.Bills.Update(bill);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Bill>> GetByStoreAsync(Guid storeId)
        {
            return await _context.Bills.Include(b => b.Items).Where(b => b.StoreId == storeId).ToListAsync();
        }

        public async Task<IEnumerable<Bill>> GetByUserDateRangeAsync(Guid userId, DateTime start, DateTime end)
        {
            return await _context.Bills.Include(b => b.Items).Where(b => b.UserId == userId && b.CreatedAt >= start && b.CreatedAt <= end).ToListAsync();
        }

        public async Task<IEnumerable<Bill>> GetByStoreDateRangeAsync(Guid storeId, DateTime start, DateTime end)
        {
            return await _context.Bills.Include(b => b.Items).Where(b => b.StoreId == storeId && b.CreatedAt >= start && b.CreatedAt <= end).ToListAsync();
        }

        public async Task<Bill?> GetByNumberAsync(string billNumber)
        {
            return await _context.Bills
                .Include(b => b.Items)
                .Include(b => b.AuditLogs)
                .FirstOrDefaultAsync(b => b.BillNumber == billNumber || b.Id.ToString() == billNumber);
        }

        public async Task<IEnumerable<Bill>> SearchAsync(string numberOrReference)
        {
            return await _context.Bills.Include(b => b.Items)
                .Where(b => b.Id.ToString().Contains(numberOrReference) || b.Items.Any(i => i.ProductName.Contains(numberOrReference)))
                .ToListAsync();
        }

        public async Task<decimal> GetStoreRevenueAsync(Guid storeId)
        {
            return await _context.Bills
                .Where(b => b.StoreId == storeId && b.Status == BillStatus.Finalized)
                .SumAsync(b => b.FinalAmount);
        }


        public async Task<IEnumerable<TopCustomerDto>> GetTopCustomersAsync(Guid storeId, int count)
        {
            return await _context.Bills
                .Where(b => b.StoreId == storeId)
                .GroupBy(b => b.UserId)
                .Select(g => new TopCustomerDto { UserId = g.Key, Total = g.Sum(b => b.FinalAmount) })
                .OrderByDescending(x => x.Total)
                .Take(count)
                .ToListAsync();
        }

        public async Task<IEnumerable<TopProductDto>> GetTopProductsAsync(Guid storeId, int count)
        {
            return await _context.Bills
                .Where(b => b.StoreId == storeId)
                .SelectMany(b => b.Items)
                .GroupBy(i => i.ProductId)
                .Select(g => new TopProductDto { ProductId = g.Key, TotalQty = g.Sum(i => i.Quantity) })
                .OrderByDescending(x => x.TotalQty)
                .Take(count)
                .ToListAsync();
        }

        public async Task RefundAsync(Guid billId)
        {
            var bill = await _context.Bills.FirstOrDefaultAsync(b => b.Id == billId);
            if (bill != null)
            {
                bill.Status = BillStatus.Cancelled;
                await _context.SaveChangesAsync();
            }
        }

        public async Task AddPaymentAsync(Payment payment)
        {
            await _context.Payments.AddAsync(payment);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<Payment>> GetPaymentsByBillIdAsync(Guid billId)
        {
            return await _context.Payments
                .AsNoTracking()
                .Where(p => p.BillId == billId)
                .OrderByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<Payment?> GetPaymentByIdAsync(Guid paymentId)
        {
            return await _context.Payments.FirstOrDefaultAsync(p => p.Id == paymentId);
        }

        public async Task<Payment?> GetSuccessfulPaymentByBillIdAsync(Guid billId)
        {
            return await _context.Payments
                .Where(p => p.BillId == billId && p.Status == PaymentStatus.Success)
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
        }

       

        public async Task<(IReadOnlyList<Bill>, int)> GetPagedAsync(int page, int pageSize, string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? sortBy, string? search)
        {
            var query = _context.Bills.Include(b => b.Items).AsQueryable();
            if (!string.IsNullOrEmpty(status) && status != "undefined" && status != "null")
            {
                if (Enum.TryParse<BillStatus>(status, true, out var parsedStatus))
                    query = query.Where(b => b.Status == parsedStatus);
                else
                    query = query.Where(_ => false);
            }
            if (userId.HasValue)
                query = query.Where(b => b.UserId == userId);
            if (storeId.HasValue)
                query = query.Where(b => b.StoreId == storeId);
            if (start.HasValue)
                query = query.Where(b => b.CreatedAt >= start.Value);
            if (end.HasValue)
                query = query.Where(b => b.CreatedAt <= end.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(b => b.BillNumber.Contains(term) || b.Items.Any(i => i.ProductName.Contains(term)));
            }
            if (!string.IsNullOrEmpty(sortBy))
            {
                query = sortBy switch
                {
                    "amount_desc" => query.OrderByDescending(b => b.FinalAmount),
                    "amount_asc" => query.OrderBy(b => b.FinalAmount),
                    "date_desc" => query.OrderByDescending(b => b.CreatedAt),
                    "date_asc" => query.OrderBy(b => b.CreatedAt),
                    _ => query.OrderByDescending(b => b.CreatedAt)
                };
            }
            var total = await query.CountAsync();
            var skip = Math.Max(0, (page - 1) * pageSize);
            var bills = await query.Skip(skip).Take(pageSize).ToListAsync();
            return (bills, total);
        }

        public async Task<SalesSummaryDto> GetSalesSummaryAsync(string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? search)
        {
            var query = _context.Bills.AsQueryable();

            if (!string.IsNullOrEmpty(status) && status != "undefined" && status != "null")
            {
                if (Enum.TryParse<BillStatus>(status, true, out var parsedStatus))
                    query = query.Where(b => b.Status == parsedStatus);
                else
                    query = query.Where(_ => false);
            }
            if (userId.HasValue)
                query = query.Where(b => b.UserId == userId);
            if (storeId.HasValue)
                query = query.Where(b => b.StoreId == storeId);
            if (start.HasValue)
                query = query.Where(b => b.CreatedAt >= start.Value);
            if (end.HasValue)
                query = query.Where(b => b.CreatedAt <= end.Value);
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim();
                query = query.Where(b => b.BillNumber.Contains(term));
            }

            var stats = await query
                .GroupBy(_ => 1)
                .Select(g => new
                {
                    TotalRevenue = g.Sum(b => (decimal?)b.FinalAmount) ?? 0,
                    TotalTaxes = g.Sum(b => (decimal?)b.TaxAmount) ?? 0,
                    TotalOrders = g.Count(),
                    AverageOrderValue = g.Average(b => (decimal?)b.FinalAmount) ?? 0
                })
                .FirstOrDefaultAsync();

            return new SalesSummaryDto
            {
                TotalRevenue = stats?.TotalRevenue ?? 0,
                TotalTaxes = stats?.TotalTaxes ?? 0,
                TotalOrders = stats?.TotalOrders ?? 0,
                AverageOrderValue = stats?.AverageOrderValue ?? 0
            };
        }

        public async Task AddRefundRequestAsync(RefundRequest request)
        {
            await _context.RefundRequests.AddAsync(request);
            await _context.SaveChangesAsync();
        }

        public async Task<RefundRequest?> GetRefundRequestByIdAsync(Guid id)
        {
            return await _context.RefundRequests
                .Include(r => r.Bill)
                    .ThenInclude(b => b.Items)
                .Include(r => r.Items)
                .FirstOrDefaultAsync(r => r.Id == id);
        }

        public async Task UpdateRefundRequestAsync(RefundRequest request)
        {
            _context.RefundRequests.Update(request);
            await _context.SaveChangesAsync();
        }

        public async Task<IEnumerable<RefundRequest>> GetRefundRequestsV2Async(Guid? storeId, RefundStatus? status)
        {
            var query = _context.RefundRequests
                .Include(r => r.Bill)
                    .ThenInclude(b => b.Items)
                .Include(r => r.Items)
                .AsNoTracking()
                .AsQueryable();

            if (storeId.HasValue)
                query = query.Where(r => r.Bill.StoreId == storeId);

            if (status.HasValue)
                query = query.Where(r => r.Status == status);

            return await query.OrderByDescending(r => r.CreatedAt).ToListAsync();
        }

        public async Task<Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction> BeginTransactionAsync()
        {
            return await _context.Database.BeginTransactionAsync();
        }

        public async Task<string> ExportCsvAsync()
        {
            var bills = await _context.Bills.Include(b => b.Items).ToListAsync();
            var builder = new System.Text.StringBuilder();
            builder.AppendLine("BillId,BillNumber,StoreId,UserId,TotalAmount,TaxAmount,FinalAmount,CreatedAt,Status");
            foreach (var b in bills)
            {
                builder.AppendLine($"{b.Id},{b.BillNumber},{b.StoreId},{b.UserId},{b.TotalAmount},{b.TaxAmount},{b.FinalAmount},{b.CreatedAt:O},{b.Status}");
            }
            return builder.ToString();
        }

        public async Task AddAuditLogAsync(BillAuditLog auditLog)
        {
            await _context.BillAuditLogs.AddAsync(auditLog);
            await _context.SaveChangesAsync();
        }

        public async Task<IdempotencyRecord?> GetIdempotencyRecordAsync(string id)
        {
            return await _context.IdempotencyRecords.FirstOrDefaultAsync(i => i.Id == id);
        }

        public async Task AddIdempotencyRecordAsync(IdempotencyRecord record)
        {
            await _context.IdempotencyRecords.AddAsync(record);
            await _context.SaveChangesAsync();
        }
    }
}
