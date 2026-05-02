
using Microsoft.EntityFrameworkCore;
using ProductService.Data;
using ProductService.Entities;
using System;
using System.Linq;
using System.Threading.Tasks;

public class DbCheck
{
    public static async Task Run(ProductDbContext context)
    {
        var count = await context.Products.CountAsync();
        var activeCount = await context.Products.CountAsync(p => p.IsActive);
        Console.WriteLine($"Total Products: {count}");
        Console.WriteLine($"Active Products: {activeCount}");
        
        var first = await context.Products.FirstOrDefaultAsync();
        if (first != null) {
            Console.WriteLine($"First Product: {first.Name}, StoreId: {first.StoreId}, IsActive: {first.IsActive}");
        }
    }
}
