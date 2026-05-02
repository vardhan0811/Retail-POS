# RetailPOS — Enterprise Billing & Store Management System

> A modern, distributed, real-time Retail POS + Admin Control System built using Angular + .NET Microservices.

---

## 🌟 Overview

**RetailPOS** is a full-stack enterprise-grade retail management platform designed for:

* ⚡ High-speed billing (POS terminal)
* 🧠 Centralized admin intelligence
* 🏬 Multi-store management
* 🔐 Secure role-based access
* 📊 Real-time analytics

It separates **Operational Flow (POS)** and **Control Flow (Admin)** — just like real-world enterprise systems.

---

## 📸 Screenshots

---

### 🔹 1. Landing Pages

`/docs/screenshots/landing.png`
![Landing](docs/screenshots/landing.png)

`/docs/screenshots/landing2.png`
![Landing](docs/screenshots/landing2.png)

`/docs/screenshots/landing3.png`
![Landing](docs/screenshots/landing3.png)

`/docs/screenshots/landing4.png`
![Landing](docs/screenshots/landing4.png)

---

### 🔹 2. Authentication

`/docs/screenshots/login.png`
![Login](docs/screenshots/login.png)

---

### 🔹 3. Admin Dashboard & Setup

`/docs/screenshots/admin-dashboard.png`
![Admin Dashboard](docs/screenshots/admin-dashboard.png)

`/docs/screenshots/admin-catalog.png`
![Catalog](docs/screenshots/admin-catalog.png)

`/docs/screenshots/admin-catalog-edit.png`
![Catalog Edit](docs/screenshots/admin-catalog-edit.png)

`/docs/screenshots/admin-inventory.png`
![Inventory](docs/screenshots/admin-inventory.png)

`/docs/screenshots/admin-inventory-edit.png`
![Inventory Edit](docs/screenshots/admin-inventory-edit.png)

---

### 🔹 4. User & Access Control

`/docs/screenshots/admin-users.png`
![Users](docs/screenshots/admin-users.png)

`/docs/screenshots/new-user-approval.png`
![New User Approval](docs/screenshots/new-user-approval.png)

`/docs/screenshots/admin-approval.png`
![Admin Approval](docs/screenshots/admin-approval.png)

`/docs/screenshots/assign-role-by-admin.png`
![Assign Role](docs/screenshots/assign-role-by-admin.png)


---

### 🔹 5. Reports & Monitoring

`/docs/screenshots/admin-reports.png`
![Reports](docs/screenshots/admin-reports.png)

---
### 🔹 6. Refunds Page

`/docs/screenshots/admin-refunds-page.png`
![Refunds Page](docs/screenshots/admin-refunds-page.png)

---

### 🔹 7. POS Billing Flow (End-to-End)

#### 🖥 Step 1: POS Terminal (Add Products)

`/docs/screenshots/pos-terminal.png`
![POS Terminal](docs/screenshots/pos-terminal.png)

#### 💳 Step 2: Payment Processing

`/docs/screenshots/payment.png`
![Payment](docs/screenshots/payment.png)

#### ✅ Step 3: Transaction Finalized

`/docs/screenshots/transaction-finalized.png`
![Transaction Finalized](docs/screenshots/transaction-finalized.png)

#### 📧 Step 4: Digital Receipt Email

`/docs/screenshots/invoice-email.png`
![Invoice Email](docs/screenshots/invoice-email.png)

#### 📧 Step 5: Digital Receipt EmailSent

`/docs/screenshots/mail-sent.png`
![Mail Sent](docs/screenshots/mail-sent.png)

### 🖨 Step 6: Invoice Management

`/docs/screenshots/invoice-download.png`
![Invoice Download](docs/screenshots/invoice-download.png)

#### ⬇ Step 7: Bill Download

`/docs/screenshots/bill-download.png`
![Bill Download](docs/screenshots/bill-download.png)

#### 🔍 Step 8: Transaction Details

`/docs/screenshots/transaction-detail.png`
![Transaction Detail](docs/screenshots/transaction-detail.png)

#### 🧾 Step 9: Bills Overview

`/docs/screenshots/bills.png`
![Bills](docs/screenshots/bills.png)

---

### 🔹 7. Refund Workflow

#### 🔄 Step 1: Initiate Refund

`/docs/screenshots/initiate-refund.png`
![Initiate Refund](docs/screenshots/initiate-refund.png)

#### 📥 Step 2: Approve Refund

`/docs/screenshots/approve-refund.png`
![Approve Refund](docs/screenshots/approve-refund.png)

#### ✔ Step 3: Refund Settled

`/docs/screenshots/settled-refund.png`
![Settled Refund](docs/screenshots/settled-refund.png)

#### 📄 Step 4: Print Voucher

`/docs/screenshots/print-voucher.png`
![Refund Receipt](docs/screenshots/print-voucher.png)

---

#### 💸 Refunded Bills

`/docs/screenshots/bills-refunded.png`
![Refunded Bills](docs/screenshots/bills-refunded.png)

---

### 🔹 8. Reports & Monitoring

`/docs/screenshots/admin-reports.png`
![Reports](docs/screenshots/admin-reports.png)

---

### 🔹 9. Profile & User View

`/docs/screenshots/profile-page.png`
![Profile](docs/screenshots/profile-page.png)

---



## 🧠 Core Concept (IMPORTANT)

RetailPOS is built around **3 key pillars**:

### 1️⃣ Role-Based System (RBAC)

| Role    | Access              |
| ------- | ------------------- |
| ADMIN   | Full system control |
| CASHIER | POS only            |

---

### 2️⃣ Store-Based Isolation

* Each user is assigned to **specific stores**
* Users **CANNOT access other stores**
* Admin can access **all stores**

---

### 3️⃣ Mode-Based Execution

| Mode  | Purpose                |
| ----- | ---------------------- |
| ADMIN | Monitoring & control   |
| POS   | Billing & transactions |

---

## 🔐 Authentication Flow (Real System Logic)

```text
User logs in
   ↓
Backend validates (JWT issued)
   ↓
Frontend stores session
   ↓
Redirect logic:
   ADMIN   → /admin
   CASHIER → /pos
```

👉 No ambiguity
👉 No "mode confusion"
👉 Deterministic routing

---

## ⚙️ Features

### 🖥️ Admin Panel

* 📊 Real-time dashboard (revenue, refunds, alerts)
* 👥 User approval & role assignment
* 🏬 Store management
* 📦 Inventory control
* 📈 Reports & analytics
* 💸 Refund approvals
* 🔐 Access control system

---

### 🛒 POS Terminal

* ⚡ Ultra-fast billing
* 🔍 Barcode-ready input
* 🧮 GST + tax calculations
* 💳 Payment processing
* 🧾 Receipt generation (PDF + Thermal)
* 🔄 Refund initiation

---

## 🔄 Refund System (Advanced)

* Multi-step approval flow
* Audit tracking
* Admin-controlled settlement

---

### 👥 User Lifecycle

```text
Signup → Pending Approval → Admin Assigns Role + Store → Activated
```

---

### 🔒 Security

* JWT Authentication
* Role-based authorization
* Store-level data isolation
* Session validation guards

---

## 🏗️ Architecture & Communication

### 🔹 Microservices-Based Design
RetailPOS follows a highly decoupled **Microservices Architecture**, where each domain (Auth, Product, Billing, Admin) is an independent service with its own database, ensuring high availability and fault isolation.

| Service        | Responsibility          | Tech Stack          |
| -------------- | ----------------------- | ------------------- |
| **AuthService** | Identity, JWT & RBAC    | .NET 9, SQL Server  |
| **ProductService** | Inventory & Catalog  | .NET 9, SQL Server  |
| **BillingService** | Transactions & Lifecycle| .NET 9, SQL Server  |
| **AdminService** | Aggregation & Analytics | .NET 9, SQL Server  |
| **ApiGateway**  | Routing & Authentication| .NET 9, Ocelot      |

---

### 🔹 Event-Driven Communication (RabbitMQ)
The system uses **RabbitMQ (via MassTransit)** for asynchronous, eventual consistency between services. This ensures that a sale in the Billing service correctly updates stock in the Product service without tight coupling.

#### 📦 Key Event Flows

| Event | Publisher | Subscriber | Action |
| :--- | :--- | :--- | :--- |
| `BillCreatedEvent` | BillingService | ProductService | Initiates stock reservation check. |
| `StockReservedEvent` | ProductService | BillingService | Confirms stock availability to proceed with checkout. |
| `BillCompletedEvent` | BillingService | ProductService | Finalizes stock deduction after successful payment. |
| `BillCancelledEvent` | BillingService | ProductService | Restores reserved stock back to the catalog. |
| `UserCreatedEvent` | AuthService | AdminService | Notifies admin for role and store assignment. |
| `UserRoleUpdatedEvent` | AdminService | AuthService | Synchronizes updated permissions across the system. |

---

### 🔹 Frontend Architecture
*   **Angular (Standalone Components)**: Optimized for performance and lazy loading.
*   **Reactive State**: Using RxJS for real-time terminal updates.
*   **Secure Guards**: Logic-based `UrlTree` redirections to prevent loops.

---

## 🔄 System Flow

### Admin Flow

```text
Login → Dashboard → Manage Stores/Users → Monitor System
```

---

### Cashier Flow

```text
Login → POS Terminal → Billing → Payment → Receipt
```

---

## 🚀 Getting Started

### 🔧 Prerequisites

* .NET 9 SDK
* Node.js (v20+)
* SQL Server
* RabbitMQ

---

### ⚙️ Backend Setup

```bash
git clone <your-repo>
cd project-root
```

Update DB in all services:

```json
"ConnectionStrings": {
  "DefaultConnection": "your-sql-server"
}
```

Run migrations:

```bash
dotnet ef database update
```

Start services:

```text
AuthService
ProductService
BillingService
AdminService
ApiGateway
```

---

### 🌐 Frontend Setup

```bash
cd pos-frontend
npm install
npm start
```

Open:

```text
http://localhost:4200
```

---

## 📁 Folder Structure

```text
ApiGateway/
AuthService/
ProductService/
BillingService/
AdminService/
Shared.Contracts/
Shared.Messaging/
pos-frontend/
docs/screenshots/
```
---

## ⚠️ Known Edge Cases (Handled)

* ✅ Prevent redirect loops
* ✅ Role-based routing
* ✅ Store isolation enforcement
* ✅ Session persistence
* ✅ Unauthorized access blocking
* ✅ Admin approval flow

---

## 💡 Future Enhancements

* 📱 Mobile POS app
* 📡 Offline sync mode
* 🧠 AI sales insights
* 🧾 GST invoice export (India-ready)
* 🔔 Notification system

---

## 🏁 Conclusion

RetailPOS is not just a CRUD app —
it’s a **real-world enterprise system simulation** with:

* Clean architecture
* Strong domain separation
* Production-like flows

---


