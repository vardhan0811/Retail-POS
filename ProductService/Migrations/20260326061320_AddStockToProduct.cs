using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductService.Migrations
{
    /// <inheritdoc />
    public partial class AddStockToProduct : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_Products_TaxId",
                table: "Products",
                column: "TaxId");

            migrationBuilder.AddForeignKey(
                name: "FK_Products_Taxes_TaxId",
                table: "Products",
                column: "TaxId",
                principalTable: "Taxes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Products_Taxes_TaxId",
                table: "Products");

            migrationBuilder.DropIndex(
                name: "IX_Products_TaxId",
                table: "Products");
        }
    }
}
