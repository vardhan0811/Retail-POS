# Retail POS & Billing Management System

Retail POS & Billing Management System is a production-grade, microservices-oriented Retail Point of Sale and Store Management system. It is designed for high-performance retail environments, offering a seamless operator experience with robust backend data integrity.

## 🚀 Key Features

### 🛒 High-Fidelity POS Terminal
- **Keyboard-First UX**: Rapid scanning with auto-focus search, `Enter-to-Add`, and contextual shortcuts (`+`/`-`/`Ctrl+Enter`).
- **Real-Time Inventory**: Automatic stock validation during cart updates with "Low Stock" and "Out of Stock" visual alerts.
- **Hold & Resume**: Pause complex transactions to serve other customers and resume them later from any terminal.
- **Price Breakdown**: Automated tax (GST) calculation and professional financial summaries.

### 📊 Operator Dashboard
- **Live Revenue Tracking**: Real-time sales aggregation for today's session.
- **Actionable History**: Visual billing log with status-coded badges (Awaiting Payment, Completed, Refunded, Void).
- **Advanced Filtering**: Ultra-fast search by Bill #, Amount, or Date.

### 🛡️ Secure Backend (Microservices)
- **Distributed Architecture**: Modular services for Auth, Products, Billing, and Administration.
- **Event-Driven Inventory**: RabbitMQ integration ensuring stock consistency across services.
- **API Gateway**: Ocelot-based routing with JWT authentication and role-based access control.
- **Audit Logging**: Comprehensive event logging (Serilog) for critical transactions and stock movements.

### 🖨️ Professional Receipts
- **POS Ready**: Thermal-printer optimized receipt layouts (80mm).
- **Digital Downloads**: Instant PDF generation for digital sharing.
- **Ownership Validation**: Secured receipt endpoints ensuring privacy and data isolation.

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | .NET 9, ASP.NET Core, EF Core, SQL Server |
| **Messaging** | RabbitMQ (MassTransit) |
| **Gateway** | Ocelot API Gateway |
| **Frontend** | Angular 21, Tailwind CSS, RxJS, Angular Material |
| **Logging** | Serilog (File & Console) |

## 📁 Project Structure

```text
├── ApiGateway/          # Ocelot Gateway (Entry point: 5000)
├── AuthService/         # Identity & JWT Management
├── ProductService/      # Product Catalog & Inventory
├── BillingService/      # Order Processing & Lifecycle
├── AdminService/        # Analytics & Admin Tools
├── NotificationService/ # Async Messaging & Notifications
├── Shared.Contracts/    # Cross-service DTOs and Interfaces
├── Shared.Messaging/    # RabbitMQ Event Definitions
└── pos-frontend/        # Angular 21 SPA (Tailwind CSS)
```

## 🏁 Getting Started

### Prerequisites
- .NET 9 SDK
- Node.js (v20+)
- SQL Server (or LocalDB)
- RabbitMQ (Docker or Local)

### Backend Setup
1. Open `RetailPOS.sln` in Visual Studio or VS Code.
2. Update connection strings in `appsettings.json` for each service.
3. Start the services (ordered): `Auth` -> `Product` -> `Billing` -> `Admin` -> `ApiGateway`.

### Frontend Setup
1. Navigate to `pos-frontend`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Access the POS at `http://localhost:4200`.

## ⚙️ Operational Flow
1. **Login**: Authenticated as Cashier or Admin.
2. **Sale**: Add items to cart -> Checkout -> Select Payment (Cash/Card).
3. **Fulfillment**: Stock is automatically deducted via RabbitMQ events upon bill finalization.
4. **Refund**: Cashier initiates request -> Admin approves via Dashboard -> Stock is restored.

---
*Created by Antigravity for Production Retail Environments.*
