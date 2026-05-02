using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class AddTotalRefundAmountToRefundRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "RequestedByEmail",
                table: "RefundRequests",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "RequestedByName",
                table: "RefundRequests",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<decimal>(
                name: "TotalRefundAmount",
                table: "RefundRequests",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<Guid>(
                name: "BillId1",
                table: "Payments",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Payments_BillId1",
                table: "Payments",
                column: "BillId1");

            migrationBuilder.AddForeignKey(
                name: "FK_Payments_Bills_BillId1",
                table: "Payments",
                column: "BillId1",
                principalTable: "Bills",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Bills_BillId1",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_BillId1",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "RequestedByEmail",
                table: "RefundRequests");

            migrationBuilder.DropColumn(
                name: "RequestedByName",
                table: "RefundRequests");

            migrationBuilder.DropColumn(
                name: "TotalRefundAmount",
                table: "RefundRequests");

            migrationBuilder.DropColumn(
                name: "BillId1",
                table: "Payments");
        }
    }
}
