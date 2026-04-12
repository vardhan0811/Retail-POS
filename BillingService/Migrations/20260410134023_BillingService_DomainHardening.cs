using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class BillingService_DomainHardening : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PaymentId",
                table: "Bills",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "Bills",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxPercentage",
                table: "BillItems",
                type: "decimal(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(18,2)");

            migrationBuilder.AddColumn<decimal>(
                name: "MRP",
                table: "BillItems",
                type: "decimal(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Bills_CreatedAt",
                table: "Bills",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Bills_StoreId",
                table: "Bills",
                column: "StoreId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Bills_CreatedAt",
                table: "Bills");

            migrationBuilder.DropIndex(
                name: "IX_Bills_StoreId",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "PaymentId",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "Bills");

            migrationBuilder.DropColumn(
                name: "MRP",
                table: "BillItems");

            migrationBuilder.AlterColumn<decimal>(
                name: "TaxPercentage",
                table: "BillItems",
                type: "decimal(18,2)",
                nullable: false,
                oldClrType: typeof(decimal),
                oldType: "decimal(5,2)",
                oldPrecision: 5,
                oldScale: 2);
        }
    }
}
