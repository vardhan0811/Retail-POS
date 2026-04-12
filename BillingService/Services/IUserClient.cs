using System;
using System.Threading.Tasks;

namespace BillingService.Services
{
    public interface IUserClient
    {
        Task<bool> UserExistsAsync(Guid userId);
    }

    public interface IStoreClient
    {
        Task<bool> StoreExistsAsync(Guid storeId);
    }
}
