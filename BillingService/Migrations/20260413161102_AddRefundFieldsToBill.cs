using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundFieldsToBill : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "RefundApprovedAt",
                table: "Bills",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "RefundStatus",
                table: "Bills",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RefundApprovedAt",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "RefundStatus",
                table: "Bills");
        }
    }
}
