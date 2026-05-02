using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class Overhaul_RefundModel_Audit : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                table: "RefundRecords",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "StoreName",
                table: "RefundRecords",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "SystemCalculatedAmount",
                table: "RefundRecords",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "OverriddenAmount",
                table: "RefundRecords",
                type: "decimal(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsOverridden",
                table: "RefundRecords",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OverrideReason",
                table: "RefundRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IdempotencyKey",
                table: "RefundRecords",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "StatusDescription",
                table: "RefundRecords",
                type: "nvarchar(max)",
                nullable: true);
                
            // Initialize new columns for existing data
            migrationBuilder.Sql("UPDATE RefundRecords SET SystemCalculatedAmount = RefundAmount, StoreName = 'Default Store', StatusDescription = 'Legacy record migrated';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "StoreId", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "StoreName", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "SystemCalculatedAmount", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "OverriddenAmount", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "IsOverridden", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "OverrideReason", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "IdempotencyKey", table: "RefundRecords");
            migrationBuilder.DropColumn(name: "StatusDescription", table: "RefundRecords");
        }
    }
}
