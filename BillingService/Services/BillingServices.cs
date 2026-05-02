using BillingService.DTOs;
using BillingService.Entities;
using Shared.Contracts.Events;
using BillingService.Repositories;
using BillingService.Middleware;
using Shared.Messaging.RabbitMq;
using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Serilog;
using Microsoft.Extensions.Options;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace BillingService.Services
{
    public class BillingServices : IBillingService
    {
        private readonly IBillingRepository _repository;
        private readonly IProductClient _productClient;
        private readonly RabbitMqPublisherBase _publisher;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly RefundPolicy _policy;
        private readonly IEmailService _emailService;
        private readonly IPdfService _pdfService;

        public BillingServices(
            IBillingRepository repository,
            IProductClient productClient,
            RabbitMqPublisherBase publisher,
            IHttpContextAccessor httpContextAccessor,
            IOptions<RefundPolicy> policy,
            IEmailService emailService,
            IPdfService pdfService)
        {
            _repository = repository;
            _productClient = productClient;
            _publisher = publisher;
            _httpContextAccessor = httpContextAccessor;
            _policy = policy.Value;
            _emailService = emailService;
            _pdfService = pdfService;
        }

        private void EnsureStoreAccess(Guid billStoreId)
        {
            var currentStoreIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("storeId")?.Value;
            var userRole = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;

            // Admins can bypass store-level restriction for global management
            if (userRole == "Admin") return;

            if (string.IsNullOrEmpty(currentStoreIdStr) || !Guid.TryParse(currentStoreIdStr, out var currentStoreId))
            {
                throw new UnauthorizedAccessException("Security Context Violation: Store identity missing from session.");
            }

            if (currentStoreId != billStoreId)
            {
                throw new UnauthorizedAccessException($"Access Denied: Cross-store data manipulation is strictly prohibited. Session Store: {currentStoreId}, Target Store: {billStoreId}");
            }
        }

        private async Task UpdateBillStateAsync(Bill bill, BillStatus newState, string action, Guid? manualUserId = null)
        {
            // Security Gate
            EnsureStoreAccess(bill.StoreId);

            var oldState = bill.Status.ToString();
            string userId;

            if (manualUserId.HasValue)
            {
                userId = manualUserId.Value.ToString();
            }
            else
            {
                var currentUserIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                userId = string.IsNullOrWhiteSpace(currentUserIdStr) ? "System" : currentUserIdStr;
            }

            bill.Status = newState;

            await _repository.UpdateAsync(bill);

            var auditLog = new BillAuditLog
            {
                BillId = bill.Id,
                Action = action,
                OldState = oldState,
                NewState = newState.ToString(),
                Timestamp = DateTime.UtcNow,
                UserId = userId
            };
            await _repository.AddAuditLogAsync(auditLog);
        }

        public async Task<BillDto> CreateBillAsync(Guid userId, Guid storeId, List<BillItemRequest> items)
        {
         // ================================
            // 🔹 1. VALIDATION
            // ================================
            if (items == null || !items.Any())
                throw new BusinessException("Bill must contain items");
            if (userId == Guid.Empty)
                throw new BusinessException("UserId is required");
            if (storeId == Guid.Empty)
                throw new BusinessException("StoreId is required");

            // Validate each item
            var productIds = new HashSet<Guid>();
            foreach (var item in items)
            {
                if (item == null)
                    throw new BusinessException("Bill item cannot be null");
                if (item.Quantity <= 0)
                    throw new BusinessException("Quantity must be greater than zero");
                if (!productIds.Add(item.ProductId))
                    throw new BusinessException($"Duplicate product in bill: {item.ProductId}");
            }

            // ================================
            // 🔹 2. INITIALIZE BILL
            // ================================
            var sessionIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("sessionId")?.Value;
            var role = _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.Role)?.Value ?? "Cashier";
            Guid.TryParse(sessionIdStr, out var sessionId);

            var bill = new Bill
            {
                Id = Guid.NewGuid(),
                BillNumber = $"BILL-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                StoreId = storeId,
                UserId = userId,
                SessionId = sessionId,
                Role = role,
                Items = new List<BillItem>(),
                Status = BillStatus.Draft
            };


            decimal totalAmount = 0;
            decimal totalTax = 0;

            // ================================
            // 🔹 3. PROCESS ITEMS
            // ================================
            foreach (var item in items)
            {
                // 🔥 CALL PRODUCT SERVICE
                var product = await _productClient.GetProductById(item.ProductId);

                if (product == null)
                    throw new NotFoundException($"Product {item.ProductId} not found");
                if (product.SellingPrice <= 0)
                    throw new BusinessException($"Product {product.Id} has invalid price");
                if (product.TaxPercentage < 0)
                    throw new BusinessException($"Product {product.Id} has invalid tax percentage");

                var itemTotal = product.SellingPrice * item.Quantity;
                var taxAmount = (itemTotal * product.TaxPercentage) / 100;

                bill.Items.Add(new BillItem
                {
                    Id = Guid.NewGuid(),
                    ProductId = product.Id,
                    ProductName = product.Name,
                    Quantity = item.Quantity,
                    MRP = product.MRP,
                    UnitPrice = product.SellingPrice,
                    TaxPercentage = product.TaxPercentage,
                    TotalPrice = itemTotal + taxAmount,
                    IsRefundable = product.IsRefundable,
                    RefundWindowHours = product.RefundWindowHours
                });

                totalAmount += itemTotal;
                totalTax += taxAmount;
            }

            // ================================
            // 🔹 4. FINAL CALCULATIONS & POLICY ENFORCEMENT
            // ================================
            var totalQuantity = bill.Items.Sum(i => i.Quantity);
            
            bill.TotalAmount = totalAmount;
            bill.TaxAmount = totalTax;
            bill.FinalAmount = totalAmount + totalTax;

            // ================================
            // 🔹 5. SAVE TO DATABASE (TRANSACTIONAL)
            // ================================
            using var transaction = await _repository.BeginTransactionAsync();
            try
            {
                await _repository.AddAsync(bill);
                await transaction.CommitAsync();
                
                // Add initial audit log outside transaction or inside if repo allows
                var auditLog = new BillAuditLog
                {
                    BillId = bill.Id,
                    Action = "CreateBill",
                    OldState = "None",
                    NewState = BillStatus.Draft.ToString(),
                    UserId = userId.ToString()
                };
                await _repository.AddAuditLogAsync(auditLog);

                Log.Information("Bill {BillNumber} created successfully", bill.BillNumber);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Failed to create bill {BillNumber}. Transaction rolled back.", bill.BillNumber);
                throw new BusinessException("An error occurred during checkout. Please try again.");
            }

            // ================================
            // 🔹 7. RETURN RESPONSE
            // ================================
            return ToBillDto(bill);
        }

        public async Task<BillDto> StartPaymentAsync(Guid billId)
        {
            int retryCount = 0;
            const int maxRetries = 3;

            while (true)
            {
                try
                {
                    using var transaction = await _repository.BeginTransactionAsync();

                    var bill = await _repository.GetByIdAsync(billId);
                    if (bill == null)
                        throw new NotFoundException($"Bill with id {billId} not found");

                    // Security Gate
                    EnsureStoreAccess(bill.StoreId);

                    if (bill.Status == BillStatus.Authorized)
                    {
                        await transaction.RollbackAsync();
                        return ToBillDto(bill);
                    }

                    if (bill.Status == BillStatus.Cancelled)
                        throw new BusinessException("Items in this transaction are no longer available in stock. The sale has been cancelled.");

                    if (bill.Status != BillStatus.Draft && bill.Status != BillStatus.Suspended)
                        throw new BusinessException($"Bill is in {bill.Status} state, cannot mark as awaiting payment");

                    await UpdateBillStateAsync(bill, BillStatus.Authorized, "StartPayment");

                    // ================================
                    // 🔥 PUBLISH EVENT: RESERVE STOCK
                    // ================================
                    var billEvent = new BillCreatedEvent
                    {
                        MessageId = Guid.NewGuid(),
                        CorrelationId = Guid.NewGuid(),
                        BillId = bill.Id,
                        StoreId = bill.StoreId,
                        Items = bill.Items.Select(i => new BillItemEvent
                        {
                            ProductId = i.ProductId,
                            ProductName = i.ProductName,
                            Quantity = i.Quantity,
                            UnitPrice = i.UnitPrice,
                            TaxPercentage = i.TaxPercentage,
                            IsRefundable = i.IsRefundable
                        }).ToList()
                    };

                    _publisher.Publish(billEvent, "bill.created");

                    await transaction.CommitAsync();
                    break; 
                }
                catch (DbUpdateConcurrencyException)
                {
                    retryCount++;
                    if (retryCount >= maxRetries) throw;
                    await Task.Delay(100);
                }
                catch (Exception ex)
                {
                    Log.Error(ex, "StartPaymentAsync failed for Bill {BillId}", billId);
                    throw;
                }
            }

            var updated = await _repository.GetByIdNoTrackingAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found after update");
            
            return ToBillDto(updated);
        }

        public async Task<BillDto> GetByIdAsync(Guid id)
        {
            var bill = await _repository.GetByIdAsync(id);
            if (bill == null)
                throw new NotFoundException($"Bill with id {id} not found");
            
            EnsureStoreAccess(bill.StoreId);
            
            await CheckAndApplyExpiry(bill);
            return ToBillDto(bill);
        }

        private async Task CheckAndApplyExpiry(Bill bill)
        {
            if (bill.Status == BillStatus.Suspended && bill.SuspendedAt.HasValue)
            {
                if (DateTime.UtcNow > bill.SuspendedAt.Value.AddMinutes(15))
                {
                    await UpdateBillStateAsync(bill, BillStatus.Expired, "AutoExpire");
                }
            }
        }

        public async Task<IReadOnlyList<BillDto>> GetAllAsync()
        {
            var bills = await _repository.GetAllAsync();
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<IReadOnlyList<BillDto>> GetByStatusAsync(BillStatus status)
        {
            var bills = await _repository.GetByStatusAsync(status);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<IReadOnlyList<BillDto>> GetByUserAsync(Guid userId)
        {
            var bills = await _repository.GetByUserAsync(userId);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<IReadOnlyList<BillDto>> GetByDateRangeAsync(DateTime start, DateTime end)
        {
            var bills = await _repository.GetByDateRangeAsync(start, end);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<IReadOnlyList<BillDto>> GetTodayAsync()
        {
            var bills = await _repository.GetTodayAsync();
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<decimal> GetTotalRevenueAsync()
        {
            return await _repository.GetTotalRevenueAsync();
        }

       

        

        public async Task<IReadOnlyList<BillDto>> GetByStoreAsync(Guid storeId)
        {
            var bills = await _repository.GetByStoreAsync(storeId);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task CancelAsync(Guid billId, Guid userId, string role)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.Authorized && bill.Status != BillStatus.Suspended && bill.Status != BillStatus.Draft)
            {
                throw new BusinessException($"Cannot cancel a bill in {bill.Status} state. Only Draft, Authorized or Suspended bills can be cancelled");
            }
            
            try
            {
                await UpdateBillStateAsync(bill, BillStatus.Cancelled, "CancelBill", userId);
            }
            catch (DbUpdateConcurrencyException)
            {
                var reloaded = await _repository.GetByIdNoTrackingAsync(billId);
                if (reloaded?.Status == BillStatus.Cancelled) return;
                throw new BusinessException("Concurrency error: This bill was modified by another user.");
            }

            // Publish cancellation event to trigger stock restoration
            var cancelEvent = new BillCancelledEvent
            {
                MessageId = Guid.NewGuid(),
                BillId = bill.Id,
                StoreId = bill.StoreId,
                TotalAmount = bill.TotalAmount,
                TaxAmount = bill.TaxAmount,
                FinalAmount = bill.FinalAmount,
                Items = bill.Items.Select(i => new BillItemEvent
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TaxPercentage = i.TaxPercentage,
                    IsRefundable = i.IsRefundable
                }).ToList()
            };

            try
            {
                _publisher.Publish(cancelEvent, "bill.cancelled");
            }
            catch (Exception)
            {
                // Log error
            }
        }

        public async Task<IReadOnlyList<BillDto>> GetByUserDateRangeAsync(Guid userId, DateTime start, DateTime end)
        {
            var bills = await _repository.GetByUserDateRangeAsync(userId, start, end);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<IReadOnlyList<BillDto>> GetByStoreDateRangeAsync(Guid storeId, DateTime start, DateTime end)
        {
            var bills = await _repository.GetByStoreDateRangeAsync(storeId, start, end);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<BillDto> GetByNumberAsync(string billNumber)
        {
            var bill = await _repository.GetByNumberAsync(billNumber);
            if (bill == null)
                throw new NotFoundException($"Bill with number {billNumber} not found");

            EnsureStoreAccess(bill.StoreId);

            return ToBillDto(bill);
        }

        public async Task<IReadOnlyList<BillDto>> SearchAsync(string numberOrReference)
        {
            var bills = await _repository.SearchAsync(numberOrReference);
            return bills.Select(ToBillDto).ToList();
        }

        public async Task<decimal> GetStoreRevenueAsync(Guid storeId)
        {
            return await _repository.GetStoreRevenueAsync(storeId);
        }

        public async Task<IReadOnlyList<TopCustomerDto>> GetTopCustomersAsync(Guid storeId, int count)
        {
            return (await _repository.GetTopCustomersAsync(storeId, count)).ToList();
        }

        public async Task<IReadOnlyList<TopProductDto>> GetTopProductsAsync(Guid storeId, int count)
        {
            return (await _repository.GetTopProductsAsync(storeId, count)).ToList();
        }



        public async Task HoldAsync(Guid billId, Guid userId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            EnsureStoreAccess(bill.StoreId);
            
            if (bill.Status != BillStatus.Authorized && bill.Status != BillStatus.Draft)
                throw new BusinessException("Only draft or authorized bills can be put on hold");

            bill.SuspendedAt = DateTime.UtcNow;
            bill.SuspendedBy = userId;
            await UpdateBillStateAsync(bill, BillStatus.Suspended, "SuspendBill", userId);
        }

        public async Task ResumeAsync(Guid billId, Guid userId, string role)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            EnsureStoreAccess(bill.StoreId);

            if (bill.Status != BillStatus.Suspended)
            {
                // check if it expired while they were looking at it
                await CheckAndApplyExpiry(bill);
                if (bill.Status == BillStatus.Expired)
                    throw new BusinessException("This bill has expired and cannot be resumed.");
                
                throw new BusinessException("Only suspended bills can be resumed");
            }

            // Security Check
            if (role != "Admin" && bill.SuspendedBy.HasValue && bill.SuspendedBy.Value != userId)
            {
                throw new BusinessException("Forbidden: Only the cashier who suspended this bill (or an Admin) can resume it.");
            }

            // TTL Check
            if (bill.SuspendedAt.HasValue && DateTime.UtcNow > bill.SuspendedAt.Value.AddMinutes(15))
            {
                await UpdateBillStateAsync(bill, BillStatus.Expired, "AutoExpire", userId);
                throw new BusinessException("This bill has expired and cannot be resumed.");
            }

            try
            {
                // Clear suspended metadata on resume
                bill.SuspendedAt = null;
                bill.SuspendedBy = null;
                await UpdateBillStateAsync(bill, BillStatus.Draft, "ResumeBill", userId);
            }
            catch (DbUpdateConcurrencyException)
            {
                var reloaded = await _repository.GetByIdNoTrackingAsync(billId);
                if (reloaded?.Status == BillStatus.Draft) return;
                throw new BusinessException("Concurrency error: This bill was modified by another user.");
            }
        }

        public async Task FinalizeAsync(Guid billId, Guid paymentId)
        {
            if (paymentId == Guid.Empty)
                throw new BusinessException("PaymentId is required");

            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            EnsureStoreAccess(bill.StoreId);

            var payment = await _repository.GetPaymentByIdAsync(paymentId)
                ?? throw new NotFoundException($"Payment with id {paymentId} not found");

            if (payment.BillId != billId)
                throw new BusinessException("Payment does not belong to this bill");

            if (payment.Status != PaymentStatus.Success)
                throw new BusinessException("Successful payment is required before finalization");

            if (bill.Status == BillStatus.Finalized)
            {
                Log.Information("FinalizeAsync: Bill {BillId} is already finalized. Skipping.", billId);
                return;
            }

            if (bill.Status != BillStatus.Authorized)
                throw new BusinessException("Bill is not ready for finalization");

            // Idempotency Check
            var idempotencyKey = _httpContextAccessor.HttpContext?.Request.Headers["Idempotency-Key"].ToString();
            if (!string.IsNullOrWhiteSpace(idempotencyKey))
            {
                var existingRecord = await _repository.GetIdempotencyRecordAsync(idempotencyKey);
                if (existingRecord != null)
                {
                    Log.Information("Idempotent request detected. Skipping processing for Bill {BillId}", billId);
                    return;
                }
            }

            // --- ATOMIC TRANSACTION START ---
            using var transaction = await _repository.BeginTransactionAsync();
            try
            {
                // 1. Locally update Bill status
                bill.PaymentId = paymentId;
                bill.CompletedAt = DateTime.UtcNow;
                await UpdateBillStateAsync(bill, BillStatus.Finalized, "FinalizeBill");

                // 2. Synchronously notify ProductService to deduct physical stock
                Log.Information("Triggering Synchronous Stock Deduction: Bill {BillId}", bill.Id);
                var stockItems = bill.Items.Select(i => (i.ProductId, i.Quantity)).ToList();
                await _productClient.FinalizeStockAsync(bill.StoreId, stockItems);

                // 3. Commit local transaction
                if (!string.IsNullOrWhiteSpace(idempotencyKey))
                {
                    await _repository.AddIdempotencyRecordAsync(new IdempotencyRecord
                    {
                        Id = idempotencyKey,
                        StatusCode = 200,
                        ResponseBody = "Finalized"
                    });
                }
                
                await transaction.CommitAsync();
                Log.Information("Bill {BillId} finalized and inventory reduced synchronously.", bill.Id);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Failed to finalize bill {BillId}. Transaction rolled back.", billId);
                throw;
            }

            // 4. Publish Event for non-critical side effects (Notifications, Analytics)
            var completedEvent = new BillCompletedEvent
            {
                MessageId = Guid.NewGuid(),
                BillId = bill.Id,
                StoreId = bill.StoreId,
                TotalAmount = bill.TotalAmount,
                TaxAmount = bill.TaxAmount,
                FinalAmount = bill.FinalAmount,
                Items = bill.Items.Select(i => new BillItemEvent
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TaxPercentage = i.TaxPercentage,
                    IsRefundable = i.IsRefundable
                }).ToList()
            };

            try
            {
                _publisher.Publish(completedEvent, "bill.completed");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to publish BillCompletedEvent for Bill {BillId}. This is non-blocking.", bill.Id);
            }
        }

        public async Task<ReceiptDto> GetReceiptAsync(Guid billId, Guid storeId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            // Ownership validation
            if (bill.StoreId != storeId)
            {
                Log.Warning("Access Denied: Store {StoreId} attempted to access Bill {BillId} belonging to Store {BillStoreId}", 
                    storeId, billId, bill.StoreId);
                throw new BusinessException("Access denied. This bill does not belong to your store.");
            }

            if (bill.Status != BillStatus.Finalized && 
                bill.Status != BillStatus.Refunded)
                throw new BusinessException("Receipts are only available for finalized or refunded bills.");

            var payment = await _repository.GetSuccessfulPaymentByBillIdAsync(billId)
                ?? throw new NotFoundException($"Successful payment for bill {billId} not found");

            return new ReceiptDto
            {
                BillId = bill.Id,
                BillNumber = bill.BillNumber,
                Date = bill.CreatedAt,
                Status = bill.Status.ToString(),
                CashierId = bill.UserId.ToString().Substring(0, 8),
                SubTotal = bill.TotalAmount,
                Tax = bill.TaxAmount,
                Discount = bill.DiscountAmount,
                Total = bill.FinalAmount,
                PaymentMethod = payment.Method,
                PaymentId = payment.Id.ToString().ToUpperInvariant(),
                TransactionReference = payment.TransactionReference ?? "N/A",
                PaidAt = payment.CreatedAt,
                StoreName = "POS RETAIL STORE", // Standard for now as per instructions
                StoreAddress = "123 Main Street, Business Dist. City, Country", // Placeholder
                Items = bill.Items.Select(i => new ReceiptItemDto
                {
                    Name = i.ProductName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    TotalPrice = i.TotalPrice
                }).ToList()
            };
        }

        public async Task<PaymentDto> CreatePaymentAsync(CreatePaymentRequest request)
        {
            if (request == null)
                throw new BusinessException("Payment request is required");
            if (request.BillId == Guid.Empty)
                throw new BusinessException("BillId is required");
            if (string.IsNullOrWhiteSpace(request.Method))
                throw new BusinessException("Payment method is required");

            // We use a transaction to ensure Payment Creation + Bill Finalization happen together
            using var transaction = await _repository.BeginTransactionAsync();
            try
            {
                var bill = await _repository.GetByIdAsync(request.BillId)
                    ?? throw new NotFoundException($"Bill with id {request.BillId} not found");

                if (bill.Status == BillStatus.Finalized)
                {
                    Log.Warning("CreatePaymentAsync: Bill {BillId} is already finalized.", request.BillId);
                    var existing = await _repository.GetSuccessfulPaymentByBillIdAsync(request.BillId);
                    if (existing != null) return ToPaymentDto(existing);
                }

                if (bill.Status != BillStatus.Authorized)
                    throw new BusinessException($"Bill is in {bill.Status} state, cannot process payment");

                var payment = new Payment
                {
                    Id = Guid.NewGuid(),
                    BillId = request.BillId,
                    Amount = bill.FinalAmount,
                    Method = request.Method.Trim().ToUpperInvariant(),
                    Status = PaymentStatus.Success,
                    TransactionReference = Guid.NewGuid().ToString("N"),
                    CreatedAt = DateTime.UtcNow
                };

                await _repository.AddPaymentAsync(payment);
                
                // AUTO-FINALIZE
                bill.PaymentId = payment.Id;
                bill.CompletedAt = DateTime.UtcNow;
                await UpdateBillStateAsync(bill, BillStatus.Finalized, "CreatePayment");

                // Synchronously notify ProductService to deduct physical stock
                Log.Information("Triggering Synchronous Stock Deduction (via Payment): Bill {BillId}", bill.Id);
                var stockItems = bill.Items.Select(i => (i.ProductId, i.Quantity)).ToList();
                await _productClient.FinalizeStockAsync(bill.StoreId, stockItems);

                // Publish Event inside transaction scope (logical)
                var completedEvent = new BillCompletedEvent
                {
                    MessageId = Guid.NewGuid(),
                    BillId = bill.Id,
                    StoreId = bill.StoreId,
                    TotalAmount = bill.TotalAmount,
                    TaxAmount = bill.TaxAmount,
                    FinalAmount = bill.FinalAmount,
                    Items = bill.Items.Select(i => new BillItemEvent
                    {
                        ProductId = i.ProductId,
                        ProductName = i.ProductName,
                        Quantity = i.Quantity,
                        UnitPrice = i.UnitPrice,
                        TaxPercentage = i.TaxPercentage,
                        IsRefundable = i.IsRefundable
                    }).ToList()
                };

                _publisher.Publish(completedEvent, "bill.completed");

                await transaction.CommitAsync();
                
                Log.Information("Payment Created and Bill Finalized: Bill {BillId}, Ref {Ref}", 
                    payment.BillId, payment.TransactionReference);

                return ToPaymentDto(payment);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Failed to process payment and finalize bill {BillId}", request.BillId);
                throw;
            }
        }

        private PaymentDto ToPaymentDto(Payment p)
        {
            return new PaymentDto
            {
                Id = p.Id,
                BillId = p.BillId,
                Amount = p.Amount,
                Method = p.Method,
                Status = p.Status,
                TransactionReference = p.TransactionReference,
                CreatedAt = p.CreatedAt
            };
        }

        public async Task<IEnumerable<PaymentDto>> GetPaymentsByBillIdAsync(Guid billId)
        {
            if (billId == Guid.Empty)
                throw new BusinessException("BillId is required");

            var payments = await _repository.GetPaymentsByBillIdAsync(billId);
            return payments.Select(p => new PaymentDto
            {
                Id = p.Id,
                BillId = p.BillId,
                Amount = p.Amount,
                Method = p.Method,
                Status = p.Status,
                TransactionReference = p.TransactionReference,
                CreatedAt = p.CreatedAt
            });
        }
       

        public async Task<PagedResult<BillDto>> GetPagedAsync(int page, int pageSize, string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? sortBy, string? search)
        {
            var userRole = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
            var currentStoreIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("storeId")?.Value;

            if (userRole != "Admin")
            {
                if (string.IsNullOrEmpty(currentStoreIdStr) || !Guid.TryParse(currentStoreIdStr, out var sessionStoreId))
                {
                    throw new UnauthorizedAccessException("Missing store context in session.");
                }
                
                // Force data to their store
                storeId = sessionStoreId;
            }

            var (bills, total) = await _repository.GetPagedAsync(page, pageSize, status, userId, storeId, start, end, sortBy, search);
            return new PagedResult<BillDto>
            {
                Items = bills.Select(ToBillDto).ToList(),
                TotalCount = total,
                Page = page,
                PageSize = pageSize
            };
        }

        public async Task<SalesSummaryDto> GetSalesSummaryAsync(string? status, Guid? userId, Guid? storeId, DateTime? start, DateTime? end, string? search)
        {
            var userRole = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
            var currentStoreIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("storeId")?.Value;

            if (userRole != "Admin")
            {
                if (string.IsNullOrEmpty(currentStoreIdStr) || !Guid.TryParse(currentStoreIdStr, out var sessionStoreId))
                {
                    throw new UnauthorizedAccessException("Missing store context in session.");
                }
                
                // Force data to their store
                storeId = sessionStoreId;
            }

            return await _repository.GetSalesSummaryAsync(status, userId, storeId, start, end, search);
        }

        public async Task<SalesDashboardSummaryDto> GetDashboardSummaryAsync(Guid? storeId = null)
        {
            var userRole = _httpContextAccessor.HttpContext?.User?.FindFirst(ClaimTypes.Role)?.Value;
            var currentStoreIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst("storeId")?.Value;

            if (userRole != "Admin")
            {
                if (string.IsNullOrEmpty(currentStoreIdStr) || !Guid.TryParse(currentStoreIdStr, out var sessionStoreId))
                {
                    throw new UnauthorizedAccessException("Missing store context in session.");
                }
                
                // Force data to their store
                storeId = sessionStoreId;
            }

            var now = DateTime.UtcNow;
            var today = now.Date;
            var yesterday = today.AddDays(-1);
            var sevenDaysAgo = today.AddDays(-6);

            // Fetch data for the last 7 days
            var bills = storeId.HasValue 
                ? await _repository.GetByStoreDateRangeAsync(storeId.Value, sevenDaysAgo, today.AddDays(1))
                : await _repository.GetByDateRangeAsync(sevenDaysAgo, today.AddDays(1));

            var filteredBills = bills.Where(b => b.Status == BillStatus.Finalized || b.Status == BillStatus.Refunded).ToList();
            var cancelledBills = bills.Where(b => b.Status == BillStatus.Cancelled && b.CreatedAt >= today).ToList();

            var todayBills = filteredBills.Where(b => b.CreatedAt >= today).ToList();
            var yesterdayBills = filteredBills.Where(b => b.CreatedAt >= yesterday && b.CreatedAt < today).ToList();

            var todayRevenue = todayBills.Sum(b => b.FinalAmount);
            var yesterdayRevenue = yesterdayBills.Sum(b => b.FinalAmount);

            // Calculate Today's Refunds
            var refunds = await GetRefundRequestsV2Async(storeId);
            var todayRefundAmount = refunds
                .Where(r => r.Status == RefundStatus.SETTLED && r.CreatedAt >= today)
                .Sum(r => r.TotalRefundAmount);

            var pendingRefundsCount = refunds.Count(r => r.Status == RefundStatus.REQUESTED || r.Status == RefundStatus.UNDER_REVIEW || r.Status == RefundStatus.PENDING_APPROVAL);

            decimal change = 0;
            if (yesterdayRevenue > 0)
            {
                change = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
            }

            var summary = new SalesDashboardSummaryDto
            {
                TodayRevenue = todayRevenue,
                YesterdayRevenue = yesterdayRevenue,
                RevenueChangePercentage = Math.Round(change, 2),
                TodayTransactions = todayBills.Count,
                TodayAvgBillValue = todayBills.Any() ? Math.Round(todayRevenue / todayBills.Count, 2) : 0,
                TodayRefundAmount = todayRefundAmount,
                TodayCancelledOrders = cancelledBills.Count,
                PendingRefundsCount = pendingRefundsCount,
                LastSevenDays = filteredBills
                    .GroupBy(b => b.CreatedAt.Date)
                    .Select(g => new DailySalesDto
                    {
                        Date = g.Key,
                        Revenue = g.Sum(b => b.FinalAmount)
                    })
                    .OrderBy(d => d.Date)
                    .ToList()
            };

            return summary;
        }

        public async Task<byte[]> GetPdfReceiptAsync(ReceiptDto receipt)
        {
            return await _pdfService.GenerateInvoicePdfAsync(receipt);
        }

        public async Task<string> ExportCsvAsync()
        {
            return await _repository.ExportCsvAsync();
        }

        public async Task SendReceiptEmailAsync(Guid billId, string email, Guid storeId)
        {
            var bill = await _repository.GetByIdAsync(billId);
            if (bill == null) throw new BusinessException("Bill not found");

            var receipt = await GetReceiptAsync(billId, storeId);
            var pdfBytes = await _pdfService.GenerateInvoicePdfAsync(receipt);
            
            // 2. Prepare Email Body (HTML)
            var itemsHtml = string.Join("", receipt.Items.Select(item => $@"
                <tr style='border-bottom: 1px solid #f1f5f9;'>
                    <td style='padding: 12px 8px;'>{item.Name.ToUpper()}</td>
                    <td style='padding: 12px 8px; text-align: center;'>{item.Quantity}</td>
                    <td style='padding: 12px 8px; text-align: right;'>&#8377; {item.UnitPrice:F2}</td>
                    <td style='padding: 12px 8px; text-align: right; font-weight: 700;'>&#8377; {item.TotalPrice:F2}</td>
                </tr>"));

            var body = $@"
<div style='background-color: #f1f5f9; padding: 40px 20px; font-family: Arial, sans-serif;'>
    <div style='max-width: 700px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05);'>
        <!-- Branded Header -->
        <div style='padding: 40px; border-bottom: 2px solid #0f172a;'>
            <table style='width: 100%;'>
                <tr>
                    <td style='vertical-align: middle;'>
                        <img src='https://cdn.pixabay.com/photo/2025/12/08/16/10/bull-10002391_1280.png' style='width: 50px; height: 50px; margin-bottom: 10px;' />
                        <div style='font-size: 24px; font-weight: 900; color: #0f172a;'>RETAIL POS</div>
                        <div style='font-size: 10px; color: #64748b; letter-spacing: 2px; text-transform: uppercase;'>Official Tax Invoice</div>
                    </td>
                    <td style='text-align: right; vertical-align: top;'>
                        <div style='font-size: 10px; color: #94a3b8; font-weight: 700; margin-bottom: 5px;'>INVOICE</div>
                        <div style='font-size: 20px; font-weight: 900; color: #0f172a;'>#{receipt.BillNumber}</div>
                        <div style='font-size: 12px; color: #64748b;'>{receipt.Date:dd MMM yyyy}</div>
                    </td>
                </tr>
            </table>
        </div>

        <div style='padding: 40px;'>
            <p style='font-size: 14px; color: #475569; margin-bottom: 30px;'>Dear Customer, thank you for shopping with us! Your transaction has been successfully processed.</p>
            
            <!-- Items Table -->
            <table style='width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;'>
                <thead>
                    <tr style='border-bottom: 2px solid #0f172a;'>
                        <th style='padding: 10px 8px; text-align: left;'>DESCRIPTION</th>
                        <th style='padding: 10px 8px; text-align: center;'>QTY</th>
                        <th style='padding: 10px 8px; text-align: right;'>RATE</th>
                        <th style='padding: 10px 8px; text-align: right;'>AMOUNT</th>
                    </tr>
                </thead>
                <tbody>
                    {itemsHtml}
                </tbody>
            </table>

            <!-- Totals -->
            <div style='display: flex; justify-content: flex-end;'>
                <table style='width: 250px; margin-left: auto; border-collapse: collapse;'>
                    <tr>
                        <td style='padding: 8px 0; color: #64748b; font-size: 13px;'>Subtotal</td>
                        <td style='padding: 8px 0; text-align: right; font-weight: 700;'>&#8377; {receipt.SubTotal:F2}</td>
                    </tr>
                    <tr>
                        <td style='padding: 8px 0; color: #64748b; font-size: 13px;'>Tax (GST)</td>
                        <td style='padding: 8px 0; text-align: right; font-weight: 700;'>&#8377; {receipt.Tax:F2}</td>
                    </tr>
                    <tr style='border-top: 2px solid #0f172a;'>
                        <td style='padding: 15px 0; font-weight: 900; font-size: 15px;'>TOTAL</td>
                        <td style='padding: 15px 0; text-align: right; font-weight: 900; font-size: 20px; color: #10b981;'>&#8377; {receipt.Total:F2}</td>
                    </tr>
                </table>
            </div>
        </div>

        <!-- Footer -->
        <div style='background: #f8fafc; padding: 30px 40px; text-align: center;'>
            <div style='font-size: 12px; color: #94a3b8; line-height: 1.6;'>
                A formal PDF version of this invoice is attached to this email.<br/>
                Thank you for choosing <strong>{receipt.StoreName}</strong>.
            </div>
        </div>
    </div>
</div>";

            // 3. Send Email
            try 
            {
                await _emailService.SendEmailWithAttachmentAsync(
                    email, 
                    $"Your Receipt from POS - #{receipt.BillNumber}", 
                    body, 
                    pdfBytes, 
                    $"Invoice_{receipt.BillNumber}.pdf");

                // 4. Update Bill History
                bill.IsEmailed = true;
                bill.EmailRecipient = email;
                bill.EmailedAt = DateTime.UtcNow;
                bill.EmailResendCount++;

                await _repository.UpdateAsync(bill);
                Log.Information("Receipt {BillNumber} successfully emailed to {Email}", receipt.BillNumber, email);
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to send receipt email for Bill {BillNumber} to {Email}", receipt.BillNumber, email);
                throw new BusinessException("Failed to deliver digital receipt. Please verify SMTP settings.");
            }
        }

        public async Task<OperatorSummaryDto> GetOperatorSummaryAsync(Guid userId)
        {
            var today = DateTime.UtcNow.Date;
            var bills = await _repository.GetAllQuery()
                .Where(b => b.UserId == userId && b.CreatedAt >= today && b.Status == BillStatus.Finalized)
                .ToListAsync();

            var recentTransactions = await _repository.GetAllQuery()
                .Where(b => b.UserId == userId)
                .OrderByDescending(b => b.CreatedAt)
                .Take(5)
                .Select(b => ToBillDto(b))
                .ToListAsync();

            return new OperatorSummaryDto
            {
                TotalBillsToday = bills.Count,
                TotalRevenueToday = bills.Sum(b => b.FinalAmount),
                RecentTransactions = recentTransactions
            };
        }

        public async Task<RefundRequestDto> RequestRefundV2Async(RefundProcessRequest request)
        {
            var bill = await _repository.GetByIdAsync(request.BillId)
                ?? throw new NotFoundException($"Bill with id {request.BillId} not found");

            if (bill.Status != BillStatus.Finalized && bill.Status != BillStatus.Refunded && bill.Status != BillStatus.RefundRequested)
                throw new BusinessException("Only finalized or partially refunded bills can be refunded");

            // Prevent duplicate pending requests
            var allRequests = await _repository.GetRefundRequestsV2Async(null, null);
            if (allRequests.Any(r => r.BillId == bill.Id && (r.Status == RefundStatus.REQUESTED || r.Status == RefundStatus.APPROVED)))
                throw new BusinessException("A pending refund request already exists for this bill");

            using var transaction = await _repository.BeginTransactionAsync();
            try
            {
                var refundRequest = new RefundRequest
                {
                    Id = Guid.NewGuid(),
                    BillId = bill.Id,
                    Reason = request.Reason ?? "Customer Requested Refund",
                    Status = RefundStatus.REQUESTED,
                    StoreId = bill.StoreId,
                    StoreName = "Main Branch",
                    CreatedAt = DateTime.UtcNow
                };

                var user = _httpContextAccessor.HttpContext?.User;
                refundRequest.RequestedBy = Guid.TryParse(user?.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid) ? uid : Guid.Empty;
                refundRequest.RequestedByName = user?.FindFirst(ClaimTypes.Name)?.Value 
                                              ?? user?.FindFirst("name")?.Value 
                                              ?? user?.FindFirst("unique_name")?.Value 
                                              ?? "System Operator";
                refundRequest.RequestedByEmail = user?.FindFirst(ClaimTypes.Email)?.Value 
                                               ?? user?.FindFirst("email")?.Value 
                                               ?? "system@retailpos.com";

                if (request.Items == null || !request.Items.Any())
                {
                    foreach (var item in bill.Items)
                    {
                        var remaining = item.Quantity - item.RefundedQuantity;
                        if (remaining > 0 && item.IsRefundable)
                        {
                            refundRequest.Items.Add(CreateRefundItem(item, remaining));
                        }
                    }
                }
                else
                {
                    foreach (var reqItem in request.Items)
                    {
                        // Find item by ProductId in this bill
                        var item = bill.Items.FirstOrDefault(i => i.ProductId == reqItem.ProductId);
                        if (item == null) 
                            throw new BusinessException($"Product {reqItem.ProductId} not found in this bill");

                        // Re-validate eligibility on server-side
                        var deadline = bill.CompletedAt?.AddHours(item.RefundWindowHours) ?? DateTime.MinValue;
                        var isEligible = item.IsRefundable && DateTime.UtcNow <= deadline && item.RefundedQuantity < item.Quantity;

                        if (!isEligible)
                            throw new BusinessException($"Item {item.ProductName} is no longer eligible for refund");

                        var remaining = item.Quantity - item.RefundedQuantity;
                        if (reqItem.Quantity > remaining)
                            throw new BusinessException($"Requested quantity {reqItem.Quantity} for {item.ProductName} exceeds available {remaining}");

                        refundRequest.Items.Add(CreateRefundItem(item, reqItem.Quantity));
                    }
                }

                if (!refundRequest.Items.Any())
                    throw new BusinessException("No valid items found for refund");

                refundRequest.TotalRefundAmount = refundRequest.Items.Sum(i => i.RefundAmount);

                await _repository.AddRefundRequestAsync(refundRequest);
                await UpdateBillStateAsync(bill, BillStatus.RefundRequested, "RefundRequestedV2");
                bill.RefundStatus = RefundStatus.REQUESTED;
                await _repository.UpdateAsync(bill);

                await transaction.CommitAsync();
                return ToRefundRequestDto(refundRequest);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Failed to request refund for bill {BillId}", bill.Id);
                throw;
            }
        }

        public async Task<RefundRequestDto> ApproveRefundV2Async(Guid requestId)
        {
            var request = await _repository.GetRefundRequestByIdAsync(requestId)
                ?? throw new NotFoundException($"Refund request {requestId} not found");

            if (request.Status != RefundStatus.REQUESTED)
                throw new BusinessException("Only requested refunds can be approved");

            using var transaction = await _repository.BeginTransactionAsync();
            try
            {
                var currentUserIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
                Guid adminId = Guid.TryParse(currentUserIdStr, out var id) ? id : Guid.Empty;

                request.Status = RefundStatus.APPROVED;
                request.ApprovedBy = adminId;
                request.ApprovedAt = DateTime.UtcNow;

                var bill = request.Bill;
                
                // 🔹 On refund approval: Restore Stock & Update Bill Status
                foreach (var refundItem in request.Items)
                {
                    var billItem = bill.Items.FirstOrDefault(i => i.Id == refundItem.BillItemId);
                    if (billItem == null) continue;

                    billItem.RefundedQuantity += refundItem.Quantity;
                    billItem.IsRefunded = true;
                    
                    // inventory.stock += quantity
                    await _productClient.IncreaseStockAsync(billItem.ProductId, refundItem.Quantity);
                }

                // If full refund: bill.status = REFUNDED Else: bill.status = PARTIAL_REFUND
                bool isFullRefund = bill.Items.All(i => i.RefundedQuantity >= i.Quantity);
                var newBillStatus = isFullRefund ? BillStatus.Refunded : BillStatus.PartialRefund;
                
                bill.RefundStatus = RefundStatus.APPROVED;
                bill.RefundApprovedAt = DateTime.UtcNow;
                
                await UpdateBillStateAsync(bill, newBillStatus, "ApproveRefundV2 (Stock Restored)");
                await _repository.UpdateRefundRequestAsync(request);
                await _repository.UpdateAsync(bill);

                await transaction.CommitAsync();
                return ToRefundRequestDto(request);
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                Log.Error(ex, "Failed to approve refund {RequestId}", requestId);
                throw;
            }
        }

        public async Task<RefundRequestDto> RejectRefundV2Async(Guid requestId, string reason)
        {
            var request = await _repository.GetRefundRequestByIdAsync(requestId)
                ?? throw new NotFoundException($"Refund request {requestId} not found");

            if (request.Status != RefundStatus.REQUESTED && request.Status != RefundStatus.APPROVED)
                throw new BusinessException("Cannot reject a request in this state");

            var currentUserIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid adminId = Guid.TryParse(currentUserIdStr, out var id) ? id : Guid.Empty;

            request.Status = RefundStatus.REJECTED;
            request.RejectedBy = adminId;
            request.RejectedAt = DateTime.UtcNow;
            request.AdminNotes = reason;

            await _repository.UpdateRefundRequestAsync(request);

            var bill = request.Bill;
            // Check if any other pending requests exist
            var allRequests = await _repository.GetRefundRequestsV2Async(null, null);
            bool hasMorePending = allRequests.Any(r => r.BillId == bill.Id && r.Id != requestId && 
                (r.Status == RefundStatus.REQUESTED || r.Status == RefundStatus.APPROVED));

            if (!hasMorePending)
            {
                bill.RefundStatus = RefundStatus.REJECTED;
                bill.Status = bill.Items.Any(i => i.RefundedQuantity > 0) ? BillStatus.Refunded : BillStatus.Finalized;
                await _repository.UpdateAsync(bill);
            }

            await UpdateBillStateAsync(bill, bill.Status, $"RejectRefundV2: {reason}");

            return ToRefundRequestDto(request);
        }

        public async Task<RefundRequestDto> SettleRefundV2Async(Guid requestId)
        {
            var request = await _repository.GetRefundRequestByIdAsync(requestId)
                ?? throw new NotFoundException($"Refund request {requestId} not found");

            if (request.Status != RefundStatus.APPROVED)
                throw new BusinessException("Only approved refunds can be settled");

            var currentUserIdStr = _httpContextAccessor.HttpContext?.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid adminId = Guid.TryParse(currentUserIdStr, out var id) ? id : Guid.Empty;

            request.Status = RefundStatus.SETTLED;
            request.SettledBy = adminId;
            request.SettledAt = DateTime.UtcNow;

            var bill = request.Bill;
            bill.RefundStatus = RefundStatus.SETTLED;
            
            // Re-calculate status to ensure correct label
            bool isFullRefund = bill.Items.All(i => i.RefundedQuantity >= i.Quantity);
            await UpdateBillStateAsync(bill, isFullRefund ? BillStatus.Refunded : BillStatus.PartialRefund, "SettleRefundV2");

            await _repository.UpdateRefundRequestAsync(request);
            Log.Information("Audit: Refund {RequestId} SETTLED", requestId);

            return ToRefundRequestDto(request);
        }

        public async Task<IEnumerable<RefundRequestDto>> GetRefundRequestsV2Async(Guid? storeId = null, RefundStatus? status = null)
        {
            var records = await _repository.GetRefundRequestsV2Async(storeId, status);
            return records.Select(ToRefundRequestDto);
        }

        private RefundItem CreateRefundItem(BillItem item, int quantity)
        {
            decimal unitPrice = item.UnitPrice;
            decimal taxRate = item.TaxPercentage / 100;
            decimal baseRefund = unitPrice * quantity;
            decimal taxReversal = baseRefund * taxRate;
            decimal totalCalculated = baseRefund + taxReversal;

            return new RefundItem
            {
                Id = Guid.NewGuid(),
                BillItemId = item.Id,
                ProductId = item.ProductId,
                ProductName = item.ProductName,
                Quantity = quantity,
                UnitPriceAtTimeOfSale = item.UnitPrice,
                TaxPercentageAtTimeOfSale = item.TaxPercentage,
                SystemCalculatedAmount = totalCalculated,
                RefundAmount = totalCalculated,
                TaxReversalAmount = taxReversal
            };
        }

        private static RefundRequestDto ToRefundRequestDto(RefundRequest request)
        {
            return new RefundRequestDto
            {
                Id = request.Id,
                BillId = request.BillId,
                BillNumber = request.Bill?.BillNumber ?? "Unknown",
                Status = request.Status,
                Reason = request.Reason,
                AdminNotes = request.AdminNotes,
                StoreId = request.StoreId,
                StoreName = request.StoreName,
                RequestedByName = request.RequestedByName,
                RequestedByEmail = request.RequestedByEmail,
                CreatedAt = request.CreatedAt,
                Items = request.Items?.Select(i => new RefundItemDto
                {
                    Id = i.Id,
                    BillItemId = i.BillItemId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    RefundAmount = i.RefundAmount,
                    TaxReversalAmount = i.TaxReversalAmount
                }).ToList() ?? new List<RefundItemDto>(),
                TotalRefundAmount = request.Items?.Sum(i => i.RefundAmount) ?? 0
            };
        }

        private static BillDto ToBillDto(Bill bill)
        {
            var dto = new BillDto
            {
                Id = bill.Id,
                BillNumber = bill.BillNumber,
                StoreId = bill.StoreId,
                UserId = bill.UserId,
                TotalAmount = bill.TotalAmount,
                TaxAmount = bill.TaxAmount,
                FinalAmount = bill.FinalAmount,
                DiscountAmount = bill.DiscountAmount,
                
                Pricing = new BillPricingDto
                {
                    Subtotal = bill.TotalAmount,
                    Tax = bill.TaxAmount,
                    Discount = bill.DiscountAmount,
                    Total = bill.FinalAmount
                },

                PaymentId = bill.PaymentId,
                CreatedAt = bill.CreatedAt,
                CompletedAt = bill.CompletedAt,
                Status = bill.Status,
                RefundStatus = bill.RefundStatus,
                RefundApprovedAt = bill.RefundApprovedAt,
                
                SuspendedAt = bill.SuspendedAt,
                SuspendedBy = bill.SuspendedBy,
                TtlMinutes = 15, // Configurable if needed
                Items = bill.Items.Select(i => {
                    var deadline = bill.CompletedAt?.AddHours(i.RefundWindowHours);
                    var isEligible = i.IsRefundable && 
                                   (bill.Status == BillStatus.Finalized || bill.Status == BillStatus.PartialRefund) &&
                                   DateTime.UtcNow <= (deadline ?? DateTime.MinValue) && 
                                   i.RefundedQuantity < i.Quantity;

                    return new BillItemDto
                    {
                        Id = i.Id,
                        ProductId = i.ProductId,
                        ProductName = i.ProductName,
                        Quantity = i.Quantity,
                        MRP = i.MRP,
                        UnitPrice = i.UnitPrice,
                        TaxPercentage = i.TaxPercentage,
                        TotalPrice = i.TotalPrice,
                        IsRefundable = i.IsRefundable,
                        RefundWindowHours = i.RefundWindowHours,
                        RefundedQuantity = i.RefundedQuantity,
                        IsRefunded = i.IsRefunded,
                        IsRefundEligible = isEligible,
                        RefundDeadline = deadline
                    };
                }).ToList(),
                AuditTrail = bill.AuditLogs?.Select(a => new BillAuditLogDto
                {
                    Action = a.Action,
                    Status = a.NewState,
                    Timestamp = a.Timestamp,
                    Actor = a.UserId
                }).OrderBy(a => a.Timestamp).ToList() ?? new List<BillAuditLogDto>(),
                
                IsEmailed = bill.IsEmailed,
                EmailRecipient = bill.EmailRecipient,
                EmailedAt = bill.EmailedAt,
                EmailResendCount = bill.EmailResendCount
            };

            return dto;
        }

        public async Task<BillingSalesSummaryDto> GetSalesSummaryBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status)
        {
            var billQuery = _repository.GetAllQuery();
            billQuery = ApplyFilters(billQuery, storeId, start, end, status);

            var billData = await billQuery.Select(b => new { b.FinalAmount, b.TaxAmount, b.Status })
                .ToListAsync();

            var refundQuery = _repository.GetAllRefundRequestsQuery()
                .Where(r => r.Status == RefundStatus.APPROVED || r.Status == RefundStatus.SETTLED);
            
            refundQuery = ApplyRefundFilters(refundQuery, storeId, start, end);

            var totalRefund = await refundQuery.SumAsync(r => r.TotalRefundAmount);
            // Fallback for older records where TotalRefundAmount might be 0
            if (totalRefund == 0 && await refundQuery.AnyAsync())
            {
                totalRefund = await refundQuery.SelectMany(r => r.Items).SumAsync(i => i.RefundAmount);
            }

            return new BillingSalesSummaryDto
            {
                TotalRevenue = billData.Where(x => x.Status == BillStatus.Finalized || x.Status == BillStatus.Refunded || x.Status == BillStatus.PartialRefund).Sum(x => x.FinalAmount),
                TotalOrders = billData.Count(x => x.Status == BillStatus.Finalized || x.Status == BillStatus.Refunded || x.Status == BillStatus.PartialRefund),
                TotalTax = billData.Where(x => x.Status == BillStatus.Finalized || x.Status == BillStatus.Refunded || x.Status == BillStatus.PartialRefund).Sum(x => x.TaxAmount),
                CancelledOrders = billData.Count(x => x.Status == BillStatus.Cancelled),
                RefundAmount = totalRefund
            };
        }

        public async Task<List<SalesTrendPointDto>> GetSalesTrendBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status, string granularity)
        {
            var billQuery = _repository.GetAllQuery().Where(b => b.Status == BillStatus.Finalized || b.Status == BillStatus.Refunded || b.Status == BillStatus.PartialRefund);
            billQuery = ApplyFilters(billQuery, storeId, start, end, status);
            var billData = await billQuery.Select(b => new { b.CreatedAt, b.FinalAmount }).ToListAsync();

            var refundQuery = _repository.GetAllRefundRequestsQuery().Where(r => r.Status == RefundStatus.APPROVED || r.Status == RefundStatus.SETTLED);
            refundQuery = ApplyRefundFilters(refundQuery, storeId, start, end);
            var refundData = await refundQuery.Select(r => new { 
                Date = r.ApprovedAt ?? r.SettledAt ?? r.CreatedAt, 
                Amount = r.TotalRefundAmount > 0 ? r.TotalRefundAmount : r.Items.Sum(i => i.RefundAmount) 
            }).ToListAsync();

            var allDates = billData.Select(x => x.CreatedAt)
                .Concat(refundData.Select(x => x.Date))
                .ToList();

            if (!allDates.Any()) return new List<SalesTrendPointDto>();

            Func<DateTime, string> labeler = granularity.ToLower() switch
            {
                "hour" => (d) => d.ToString("HH:00"),
                "week" => (d) => $"Week {GetIso8601WeekOfYear(d)}",
                _ => (d) => d.ToString("MMM dd")
            };

            var trend = allDates.Select(d => labeler(d)).Distinct()
                .Select(label => new SalesTrendPointDto
                {
                    Label = label,
                    Revenue = billData.Where(x => labeler(x.CreatedAt) == label).Sum(x => x.FinalAmount),
                    Orders = billData.Count(x => labeler(x.CreatedAt) == label),
                    Refunds = refundData.Where(x => labeler(x.Date) == label).Sum(x => x.Amount)
                })
                .OrderBy(x => x.Label)
                .ToList();

            return trend;
        }

        public async Task<RefundAnalyticsDto> GetRefundAnalyticsBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status)
        {
            var billQuery = _repository.GetAllQuery();
            billQuery = ApplyFilters(billQuery, storeId, start, end, status);
            var grossRevenue = await billQuery
                .Where(b => b.Status == BillStatus.Finalized || b.Status == BillStatus.Refunded || b.Status == BillStatus.PartialRefund)
                .SumAsync(b => b.FinalAmount);

            var refundQuery = _repository.GetAllRefundRequestsQuery()
                .Where(r => r.Status == RefundStatus.APPROVED || r.Status == RefundStatus.SETTLED);
            
            refundQuery = ApplyRefundFilters(refundQuery, storeId, start, end);

            var refunds = await refundQuery
                .Select(r => new { r.TotalRefundAmount, r.Reason, Items = r.Items.Select(i => new { i.ProductName, i.RefundAmount }) })
                .ToListAsync();

            var totalRefund = refunds.Sum(x => x.TotalRefundAmount > 0 ? x.TotalRefundAmount : x.Items.Sum(i => i.RefundAmount));
            
            // If still 0, check if we have items at all
            if (totalRefund == 0 && refunds.Any(r => r.Items.Any()))
            {
                totalRefund = refunds.SelectMany(r => r.Items).Sum(i => i.RefundAmount);
            }
            
            var topProducts = refunds.SelectMany(r => r.Items)
                .GroupBy(i => i.ProductName)
                .Select(g => new RefundedProductDto 
                { 
                    ProductName = g.Key, 
                    RefundCount = g.Count(), 
                    RefundAmount = g.Sum(x => x.RefundAmount) 
                })
                .OrderByDescending(x => x.RefundAmount)
                .Take(5)
                .ToList();

            var reasons = refunds.GroupBy(r => r.Reason ?? "Not Specified")
                .Select(g => new RefundReasonDto { Reason = g.Key, Count = g.Count() })
                .OrderByDescending(x => x.Count)
                .ToList();

            return new RefundAnalyticsDto
            {
                TotalRefundAmount = totalRefund,
                RefundRate = grossRevenue > 0 ? (double)(totalRefund / grossRevenue) * 100 : 0,
                TopRefundedProducts = topProducts,
                Reasons = reasons
            };
        }

        public async Task<List<PaymentMethodDto>> GetPaymentBreakdownBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status)
        {
            var query = _repository.GetAllQuery().Where(b => b.Status == BillStatus.Finalized);
            query = ApplyFilters(query, storeId, start, end, status);

            var data = await query.SelectMany(b => b.Payments)
                .Where(p => p.Status == PaymentStatus.Success)
                .GroupBy(p => p.Method)
                .Select(g => new PaymentMethodDto { Method = g.Key, Amount = g.Sum(x => x.Amount), Count = g.Count() })
                .ToListAsync();

            return data;
        }

        public async Task<List<ProductMetricDto>> GetTopProductsBIAsync(Guid? storeId, DateTime? start, DateTime? end, string? status, int count)
        {
            var query = _repository.GetAllQuery().Where(b => b.Status == BillStatus.Finalized);
            query = ApplyFilters(query, storeId, start, end, status);

            var items = await query.SelectMany(b => b.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName })
                .Select(g => new ProductMetricDto 
                { 
                    ProductId = g.Key.ProductId, 
                    ProductName = g.Key.ProductName, 
                    TotalQuantity = g.Sum(x => x.Quantity),
                    TotalRevenue = g.Sum(x => x.TotalPrice)
                })
                .OrderByDescending(x => x.TotalQuantity)
                .Take(count)
                .ToListAsync();

            var refundQuery = _repository.GetAllRefundRequestsQuery()
                .Where(r => r.Status == RefundStatus.APPROVED || r.Status == RefundStatus.SETTLED);
            refundQuery = ApplyRefundFilters(refundQuery, storeId, start, end);
            
            var refunds = await refundQuery
                .SelectMany(r => r.Items)
                .GroupBy(i => i.BillItem.ProductId)
                .Select(g => new { ProductId = g.Key, RefundCount = g.Sum(x => x.Quantity) })
                .ToListAsync();

            foreach(var item in items)
            {
                item.RefundCount = refunds.FirstOrDefault(r => r.ProductId == item.ProductId)?.RefundCount ?? 0;
            }

            return items;
        }

        private IQueryable<RefundRequest> ApplyRefundFilters(IQueryable<RefundRequest> query, Guid? storeId, DateTime? start, DateTime? end)
        {
            if (storeId.HasValue) query = query.Where(r => r.StoreId == storeId.Value);
            
            // Use lifecycle dates for reporting accuracy
            if (start.HasValue) 
                query = query.Where(r => (r.ApprovedAt ?? r.SettledAt ?? r.CreatedAt) >= start.Value);
            
            if (end.HasValue)
                query = query.Where(r => (r.ApprovedAt ?? r.SettledAt ?? r.CreatedAt) <= end.Value);
            
            return query;
        }

        private IQueryable<Bill> ApplyFilters(IQueryable<Bill> query, Guid? storeId, DateTime? start, DateTime? end, string? status)
        {
            if (storeId.HasValue) query = query.Where(b => b.StoreId == storeId.Value);
            if (start.HasValue)   query = query.Where(b => b.CreatedAt >= start.Value);
            if (end.HasValue)     query = query.Where(b => b.CreatedAt <= end.Value);
            if (!string.IsNullOrWhiteSpace(status) && Enum.TryParse<BillStatus>(status, true, out var s))
                query = query.Where(b => b.Status == s);
            return query;
        }

        private static int GetIso8601WeekOfYear(DateTime time)
        {
            var day = System.Globalization.CultureInfo.InvariantCulture.Calendar.GetDayOfWeek(time);
            if (day >= DayOfWeek.Monday && day <= DayOfWeek.Wednesday) time = time.AddDays(3);
            return System.Globalization.CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(time, System.Globalization.CalendarWeekRule.FirstFourDayWeek, DayOfWeek.Monday);
        }
    }
}
