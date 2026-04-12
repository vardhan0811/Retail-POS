using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AdminService.Migrations
{
    /// <inheritdoc />
    public partial class AdminService_EntityOwnershipAndDashboardCleanup : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AdminReports_Users_UserId1",
                table: "AdminReports");

            migrationBuilder.DropIndex(
                name: "IX_AdminReports_UserId1",
                table: "AdminReports");

            migrationBuilder.DropColumn(
                name: "UserId1",
                table: "AdminReports");

            migrationBuilder.AddColumn<Guid>(
                name: "StoreId",
                table: "Users",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "Address",
                table: "Stores",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Stores",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.CreateIndex(
                name: "IX_Users_StoreId",
                table: "Users",
                column: "StoreId");

            migrationBuilder.CreateIndex(
                name: "IX_Stores_IsActive",
                table: "Stores",
                column: "IsActive");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Users_StoreId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Stores_IsActive",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "StoreId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Address",
                table: "Stores");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Stores");

            migrationBuilder.AddColumn<Guid>(
                name: "UserId1",
                table: "AdminReports",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdminReports_UserId1",
                table: "AdminReports",
                column: "UserId1");

            migrationBuilder.AddForeignKey(
                name: "FK_AdminReports_Users_UserId1",
                table: "AdminReports",
                column: "UserId1",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
