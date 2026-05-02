using AuthService.Entities;
using Microsoft.EntityFrameworkCore;
using Shared.Contracts.Models;

namespace AuthService.Data
{
    public static class DbSeeder
    {
        public static async Task SeedAsync(AuthDbContext context)
        {
            if (context.Permissions.Any())
            {
                await EnsureCashierCanUpdateProductAsync(context);
                return;
            }

            var adminRole = new Role { Id = Guid.NewGuid(), Name = "Admin" };
            var cashierRole = new Role { Id = Guid.NewGuid(), Name = "Cashier" };

            var createBill = new Permission { Id = Guid.NewGuid(), Name = "CREATE_BILL" };
            var viewBill = new Permission { Id = Guid.NewGuid(), Name = "VIEW_BILL" };
            var processPayment = new Permission { Id = Guid.NewGuid(), Name = "PROCESS_PAYMENT" };
            var initiateReturn = new Permission { Id = Guid.NewGuid(), Name = "INITIATE_RETURN" };
            var approveReturn = new Permission { Id = Guid.NewGuid(), Name = "APPROVE_RETURN" };

            var viewProduct = new Permission { Id = Guid.NewGuid(), Name = "VIEW_PRODUCT" };
            var createProduct = new Permission { Id = Guid.NewGuid(), Name = "CREATE_PRODUCT" };
            var updateProduct = new Permission { Id = Guid.NewGuid(), Name = "UPDATE_PRODUCT" };
            var deleteProduct = new Permission { Id = Guid.NewGuid(), Name = "DELETE_PRODUCT" };

            var viewReports = new Permission { Id = Guid.NewGuid(), Name = "VIEW_REPORTS" };

            var createUser = new Permission { Id = Guid.NewGuid(), Name = "CREATE_USER" };
            var deleteUser = new Permission { Id = Guid.NewGuid(), Name = "DELETE_USER" };
            var manageUsers = new Permission { Id = Guid.NewGuid(), Name = "MANAGE_USERS" };
            var manageStores = new Permission { Id = Guid.NewGuid(), Name = "MANAGE_STORES" };

            context.Roles.AddRange(adminRole, cashierRole);

            context.Permissions.AddRange(
                createBill, viewBill, processPayment,
                initiateReturn, approveReturn,
                viewProduct, createProduct, updateProduct, deleteProduct,
                viewReports,
                createUser, deleteUser
                , manageUsers, manageStores
            );

            context.RolePermissions.AddRange(
            new RolePermission { RoleId = adminRole.Id, PermissionId = createBill.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = viewBill.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = processPayment.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = initiateReturn.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = approveReturn.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = viewProduct.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = createProduct.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = updateProduct.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = deleteProduct.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = viewReports.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = createUser.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = deleteUser.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = manageUsers.Id },
            new RolePermission { RoleId = adminRole.Id, PermissionId = manageStores.Id },

            new RolePermission { RoleId = cashierRole.Id, PermissionId = createBill.Id },
            new RolePermission { RoleId = cashierRole.Id, PermissionId = viewBill.Id },
            new RolePermission { RoleId = cashierRole.Id, PermissionId = processPayment.Id },
            new RolePermission { RoleId = cashierRole.Id, PermissionId = initiateReturn.Id },
            new RolePermission { RoleId = cashierRole.Id, PermissionId = viewProduct.Id },
            new RolePermission { RoleId = cashierRole.Id, PermissionId = updateProduct.Id }
            );

            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Name = "System Admin",
                Email = "admin@test.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                RoleId = adminRole.Id,
                StoreId = Guid.Empty,
                Status = UserStatus.Active,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);

            await context.SaveChangesAsync();
        }

        private static async Task EnsureCashierCanUpdateProductAsync(AuthDbContext context)
        {
            // 1. Ensure all defined permissions exist in DB
            var permissionNames = new[]
            {
                "CREATE_PRODUCT", "UPDATE_PRODUCT", "DELETE_PRODUCT", "VIEW_PRODUCT",
                "CREATE_BILL", "VIEW_BILL", "PROCESS_PAYMENT", "CANCEL_BILL", "RETRY_BILL", "REFUND_BILL", "MARK_PAID_BILL", "ADD_NOTE_BILL", "EXPORT_BILL",
                "CREATE_USER", "DELETE_USER", "MANAGE_USERS", "MANAGE_STORES",
                "VIEW_REPORTS", "INITIATE_RETURN", "APPROVE_RETURN"
            };

            foreach (var name in permissionNames)
            {
                if (!await context.Permissions.AnyAsync(p => p.Name == name))
                {
                    context.Permissions.Add(new Permission { Id = Guid.NewGuid(), Name = name });
                }
            }
            await context.SaveChangesAsync();

            // 2. Ensure Admin Role has ALL permissions
            var adminRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Admin");
            if (adminRole != null)
            {
                var allPermissions = await context.Permissions.ToListAsync();
                foreach (var perm in allPermissions)
                {
                    if (!await context.RolePermissions.AnyAsync(rp => rp.RoleId == adminRole.Id && rp.PermissionId == perm.Id))
                    {
                        context.RolePermissions.Add(new RolePermission { RoleId = adminRole.Id, PermissionId = perm.Id });
                    }
                }
            }

            // 3. Ensure Cashier Role has specific permissions
            var cashierRole = await context.Roles.FirstOrDefaultAsync(r => r.Name == "Cashier");
            if (cashierRole != null)
            {
                var cashierPerms = new[] { "CREATE_BILL", "VIEW_BILL", "PROCESS_PAYMENT", "INITIATE_RETURN", "VIEW_PRODUCT", "UPDATE_PRODUCT", "VIEW_REPORTS" };
                foreach (var name in cashierPerms)
                {
                    var perm = await context.Permissions.FirstOrDefaultAsync(p => p.Name == name);
                    if (perm != null && !await context.RolePermissions.AnyAsync(rp => rp.RoleId == cashierRole.Id && rp.PermissionId == perm.Id))
                    {
                        context.RolePermissions.Add(new RolePermission { RoleId = cashierRole.Id, PermissionId = perm.Id });
                    }
                }
            }

            await context.SaveChangesAsync();
        }
    }
}