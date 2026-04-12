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

namespace BillingService.Services
{
    public class BillingServices : IBillingService
    {
        private readonly IBillingRepository _repository;
        private readonly IProductClient _productClient;
        private readonly RabbitMqPublisherBase _publisher;
        private readonly IHttpContextAccessor _httpContextAccessor;

        public BillingServices(
            IBillingRepository repository,
            IProductClient productClient,
            RabbitMqPublisherBase publisher,
            IHttpContextAccessor httpContextAccessor)
        {
            _repository = repository;
            _productClient = productClient;
            _publisher = publisher;
            _httpContextAccessor = httpContextAccessor;
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
            var bill = new Bill
            {
                Id = Guid.NewGuid(),
                BillNumber = $"BILL-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid().ToString("N")[..8].ToUpperInvariant()}",
                StoreId = storeId,
                UserId = userId,
                Items = new List<BillItem>(),
                Status = BillStatus.Pending // Fix: initially Pending, not AwaitingPayment
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
                    TotalPrice = itemTotal + taxAmount
                });

                totalAmount += itemTotal;
                totalTax += taxAmount;
            }

            // ================================
            // 🔹 4. FINAL CALCULATIONS
            // ================================
            bill.TotalAmount = totalAmount;
            bill.TaxAmount = totalTax;
            bill.FinalAmount = totalAmount + totalTax;

            // ================================
            // 🔹 5. SAVE TO DATABASE
            // ================================
            await _repository.AddAsync(bill);

            // ================================
            // 🔥 6. PUBLISH EVENT (VERY IMPORTANT)
            // ================================
            var billEvent = new BillCreatedEvent
            {
                MessageId = Guid.NewGuid(),
                CorrelationId = Guid.NewGuid(), // Pass from upstream if available
                BillId = bill.Id,
                StoreId = storeId,
                Items = bill.Items.Select(i => new BillItemEvent
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity
                }).ToList()
            };

            try
            {
                _publisher.Publish(billEvent, "bill.created");
            }
            catch (Exception)
            {
                // Log error (implement logging as needed)
                // Optionally: throw new BusinessException("Failed to publish bill-created event");
            }

            // ================================
            // 🔹 7. RETURN RESPONSE
            // ================================
            return ToBillDto(bill);
        }

        public async Task<BillDto> StartPaymentAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId);
            if (bill == null)
                throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.Pending)
                throw new BusinessException($"Bill is in {bill.Status} state, cannot mark as awaiting payment");

            // DEBUG LOGS as requested
            Console.WriteLine($"[DEBUG] StartPaymentAsync BEFORE: {bill.Status}");
            bill.Status = BillStatus.AwaitingPayment;
            Console.WriteLine($"[DEBUG] StartPaymentAsync AFTER_ASSIGN: {bill.Status}");
            
            await _repository.UpdateAsync(bill);

            // Re-fetch to verify persistence
            var updated = await _repository.GetByIdNoTrackingAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found after update");
            
            Console.WriteLine($"[DEBUG] StartPaymentAsync DB_VALUE: {updated.Status}");

            if (updated.Status != BillStatus.AwaitingPayment)
                throw new BusinessException($"Failed to persist bill status transition. Current status in DB is {updated.Status}");

            return ToBillDto(updated);
        }

        public async Task<BillDto> GetByIdAsync(Guid id)
        {
            var bill = await _repository.GetByIdNoTrackingAsync(id);
            if (bill == null)
                throw new NotFoundException($"Bill with id {id} not found");
            return ToBillDto(bill);
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

        public async Task CancelAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId);
            if (bill == null)
            {
                throw new NotFoundException($"Bill with id {billId} not found");
            }
            if (bill.Status != BillStatus.AwaitingPayment)
            {
                throw new BusinessException($"Cannot cancel a bill in {bill.Status} state. Only awaiting payment bills can be cancelled");
            }
            
            bill.Status = BillStatus.Cancelled;

            await _repository.UpdateAsync(bill);

            // Publish cancellation event to trigger stock restoration
            var cancelEvent = new BillCancelledEvent
            {
                MessageId = Guid.NewGuid(),
                BillId = bill.Id,
                StoreId = bill.StoreId,
                Items = bill.Items.Select(i => new BillItemEvent
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity
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

        public async Task RefundAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.Finalized)
                throw new BusinessException("Only finalized bills can be refunded");

            var user = _httpContextAccessor.HttpContext?.User;
            bool isAdmin = user?.IsInRole("Admin") ?? false;

            if (isAdmin)
            {
                // Full immediate refund for Admins
                await ExecuteFullRefundInternal(bill);
            }
            else
            {
                // Request refund for Cashiers
                bill.Status = BillStatus.RefundRequested;
                await _repository.UpdateAsync(bill);
            }
        }

        public async Task ApproveRefundAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.RefundRequested)
                throw new BusinessException("Bill is not in a 'Refund Requested' state");

            await ExecuteFullRefundInternal(bill);
        }

        public async Task RejectRefundAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.RefundRequested)
                throw new BusinessException("Can only reject bills that have a pending refund request");

            bill.Status = BillStatus.Finalized;
            await _repository.UpdateAsync(bill);
        }

        private async Task ExecuteFullRefundInternal(Bill bill)
        {
            // Restock first
            foreach (var item in bill.Items)
            {
                await _productClient.IncreaseStockAsync(item.ProductId, item.Quantity);
            }

            // Mark as Refunded
            bill.Status = BillStatus.Refunded;
            await _repository.UpdateAsync(bill);
            
            // Note: Since we don't have a dedicated RefundedEvent being used by ProductService right now,
            // the IncreaseStockAsync calls above handle the immediate stock fix.
        }

        public async Task HoldAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.AwaitingPayment)
                throw new BusinessException("Only bills awaiting payment can be put on hold");


            bill.Status = BillStatus.AwaitingPayment; // No specific Hold State enum for now
            await _repository.UpdateAsync(bill);
        }

        public async Task ResumeAsync(Guid billId)
        {
            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

            if (bill.Status != BillStatus.AwaitingPayment)
                throw new BusinessException("Only bills awaiting payment can be resumed");

            bill.Status = BillStatus.AwaitingPayment;
            await _repository.UpdateAsync(bill);
        }

        public async Task FinalizeAsync(Guid billId, Guid paymentId)
        {
            if (paymentId == Guid.Empty)
                throw new BusinessException("PaymentId is required");

            var bill = await _repository.GetByIdAsync(billId)
                ?? throw new NotFoundException($"Bill with id {billId} not found");

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

            if (bill.Status != BillStatus.AwaitingPayment)
                throw new BusinessException("Bill is not ready for finalization");

            bill.PaymentId = paymentId;
            bill.Status = BillStatus.Finalized;
            await _repository.UpdateAsync(bill);
            Log.Information("Bill Finalized: Bill {BillId}, PaymentID {PaymentId}", bill.Id, paymentId);

            // ================================
            // 🔥 PUBLISH EVENT: Bill Completed
            // ================================
            Log.Information("Triggering Stock Deduction: Bill {BillId}", bill.Id);
            var completedEvent = new BillCompletedEvent
            {
                MessageId = Guid.NewGuid(),
                BillId = bill.Id,
                StoreId = bill.StoreId,
                Items = bill.Items.Select(i => new BillItemEvent
                {
                    ProductId = i.ProductId,
                    Quantity = i.Quantity
                }).ToList()
            };

            try
            {
                _publisher.Publish(completedEvent, "bill.completed");
            }
            catch (Exception ex)
            {
                Log.Error(ex, "Failed to publish BillCompletedEvent for Bill {BillId}", bill.Id);
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

            if (bill.Status != BillStatus.Finalized && bill.Status != BillStatus.Refunded)
                throw new BusinessException("Receipts are only available for finalized or refunded (Completed) bills.");

            var payment = await _repository.GetSuccessfulPaymentByBillIdAsync(billId)
                ?? throw new NotFoundException($"Successful payment for bill {billId} not found");

            return new ReceiptDto
            {
                BillId = bill.Id,
                BillNumber = bill.BillNumber,
                Date = bill.CreatedAt,
                CashierId = bill.UserId.ToString().Substring(0, 8),
                SubTotal = bill.TotalAmount,
                Tax = bill.TaxAmount,
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

            var bill = await _repository.GetByIdAsync(request.BillId)
                ?? throw new NotFoundException($"Bill with id {request.BillId} not found");

            if (bill.Status != BillStatus.AwaitingPayment)
                throw new BusinessException("Bill is not in payable state");

            var existingPayments = await _repository.GetPaymentsByBillIdAsync(request.BillId);
            if (existingPayments.Any(p => p.Status == PaymentStatus.Success))
            {
                var successPayment = existingPayments.First(p => p.Status == PaymentStatus.Success);
                Log.Warning("CreatePaymentAsync: Successful payment already exists for Bill {BillId}", request.BillId);
                return new PaymentDto
                {
                    Id = successPayment.Id,
                    BillId = successPayment.BillId,
                    Amount = successPayment.Amount,
                    Method = successPayment.Method,
                    Status = successPayment.Status,
                    TransactionReference = successPayment.TransactionReference,
                    CreatedAt = successPayment.CreatedAt
                };
            }

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
            Log.Information("Payment Created: Bill {BillId}, Amount {Amount}, Method {Method}, Ref {Ref}", 
                payment.BillId, payment.Amount, payment.Method, payment.TransactionReference);

            return new PaymentDto
            {
                Id = payment.Id,
                BillId = payment.BillId,
                Amount = payment.Amount,
                Method = payment.Method,
                Status = payment.Status,
                TransactionReference = payment.TransactionReference,
                CreatedAt = payment.CreatedAt
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
            var (bills, total) = await _repository.GetPagedAsync(page, pageSize, status, userId, storeId, start, end, sortBy, search);
            return new PagedResult<BillDto>
            {
                Items = bills.Select(ToBillDto).ToList(),
                TotalCount = total
            };
        }

        public async Task<string> ExportCsvAsync()
        {
            return await _repository.ExportCsvAsync();
        }

        private static BillDto ToBillDto(Bill bill)
        {
            return new BillDto
            {
                Id = bill.Id,
                BillNumber = bill.BillNumber,
                StoreId = bill.StoreId,
                UserId = bill.UserId,
                TotalAmount = bill.TotalAmount,
                TaxAmount = bill.TaxAmount,
                FinalAmount = bill.FinalAmount,
                PaymentId = bill.PaymentId,
                CreatedAt = bill.CreatedAt,
                Status = bill.Status,
                Items = bill.Items.Select(i => new BillItemDto
                {
                    Id = i.Id,
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Quantity = i.Quantity,
                    MRP = i.MRP,
                    UnitPrice = i.UnitPrice,
                    TaxPercentage = i.TaxPercentage,
                    TotalPrice = i.TotalPrice
                }).ToList()
            };
        }
    }
}
