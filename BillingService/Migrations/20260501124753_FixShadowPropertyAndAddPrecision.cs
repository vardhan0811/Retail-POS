using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace BillingService.Migrations
{
    /// <inheritdoc />
    public partial class FixShadowPropertyAndAddPrecision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Payments_Bills_BillId1",
                table: "Payments");

            migrationBuilder.DropIndex(
                name: "IX_Payments_BillId1",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "BillId1",
                table: "Payments");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
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
    }
}
