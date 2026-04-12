# Copilot Instructions

## Core Architecture Rules

* Follow strict layered architecture: Controller → Service → Repository → DbContext
* Controllers handle HTTP only (no business logic)
* Services contain ALL business logic
* Repositories handle ONLY data persistence (no business rules)

## Service Ownership (STRICT)

* AuthService: authentication, JWT, user identity (passwords ONLY here)
* ProductService: products, categories, stock (ONLY service allowed to modify stock)
* BillingService: bills, bill items, payments, lifecycle
* AdminService: stores, users (read/control only), dashboard, reports
* NotificationService: OTP and notifications only

## Cross-Service Rules

* Services MUST communicate via HTTP or events (no shared DB)
* Do NOT duplicate business logic across services
* Do NOT assume another service’s data structure
* Always match exact API contracts (e.g., /api/products not /api/product)

## API Design Rules

* All routes must start with /api/
* Use plural naming: /api/products, /api/bills, /api/admin/stores
* Never expose Entities in APIs (DTOs only)
* Use typed responses (no object return types)

## DTO \& Validation Rules

* Use DTOs for all request/response models
* Validate input using DataAnnotations + service-level validation
* Do NOT pass Entities between layers
* Service layer must enforce business rules (not controller)

## Exception Handling

* Avoid exposing internal exception messages for 500 errors
* Use serializer-based JSON responses (no manual JSON string building)

## BillingService Rules (CRITICAL)

* Billing is a lifecycle, NOT CRUD
* Allowed states:
Pending → Hold → AwaitingPayment → Finalized → Refunded
* Rules:

  * Cannot finalize without successful payment
  * Stock reservation happens BEFORE payment (via ProductService)
  * Refund must restore stock via ProductService
  * Use enum for status (no string states)

## ProductService Rules

* Stock updates ONLY happen in ProductService
* Stock math (increase/decrease) handled in Service layer only
* Repository must NOT modify stock logic
* Always prevent negative stock

## AdminService Rules

* AdminService is READ + CONTROL layer only
* Do NOT implement business logic (no stock updates, no billing logic)
* Dashboard and reports must be computed via other services (no stored aggregates)
* Do NOT store derived data like dashboard summaries

## NotificationService Rules

* OTP persistence requires strict email normalization to lowercase
* Use composite query indexes aligned to access patterns (Email + CreatedAt)
* Enforce required column constraints for key fields
* Implement expiry-time indexing for cleanup readiness

## Data \& DB Rules

* Add indexes for frequently queried fields (StoreId, CreatedAt, etc.)
* Enforce uniqueness where required (e.g., SKU + StoreId)
* Use soft deletes where appropriate
* Do NOT store computed/derived data unnecessarily

## Event \& Messaging Rules

* Events must include idempotency identifiers (MessageId)
* Consumers must handle duplicate events safely
* Do NOT assume event delivery order
* Use events for cross-service side effects (e.g., billing → stock)

## Performance \& Consistency

* Avoid ToLower() in queries (breaks indexing)
* Use pagination for large datasets
* Invalidate cache on mutations (create/update/delete/stock change)
* Use consistent filtering and query patterns

## Terminal Operations

* Provide migration commands for manual execution
* Do NOT auto-run destructive DB commands

## Health Checks

* Enable RabbitMQ automatic recovery in health checks.

## Frontend Architecture Rules (Angular)

* Path: C:\\Users\\CyberBot\\Documents\\Playground\\Retail\_POS\_Billing\_Store\_Management\_PRD\\pos-frontend
* Use Angular with modular architecture
* Follow structure: Component → Service → API Client
* Components handle UI only (no business logic)
* Services handle state and business flow
* API services handle HTTP calls only
* Use feature-based modules:

  * auth/
  * admin/
  * pos/
  * shared/
* Do NOT mix responsibilities across modules

## API Integration Rules

* All API calls must go through centralized API service
* Always use API Gateway base URL
* Attach JWT token via interceptor (NOT manually)
* Do NOT hardcode endpoints in components
* Match backend routes exactly:
/api/products
/api/bills
/api/admin/stores

## State Management Rules

* Keep state inside services (not components)
* Use BehaviorSubject or signals for reactive state
* Components should subscribe, not control state
* Avoid global state initially (keep it simple)

## UI / UX Rules

* Follow clean, minimal, professional design
* Avoid excessive colors and gradients
* Use consistent spacing and typography
* Use:

  * Dark theme (preferred)
  * Neutral palette (slate/gray/blue)
  * Subtle shadows (not flashy)
* Do NOT:

  * Overuse animations
  * Use random colors
  * Create cluttered layouts

## Animation Rules

* Use animations only where they improve UX:

  * Page transitions
  * Modal open/close
  * Button feedback
  * Cart updates
* Animations must be subtle and fast
* Avoid distracting or unnecessary motion

## Role-Based UI Rules

* UI must adapt based on user role from JWT
* Admin:

  * Access to admin dashboard
  * Stores, users, reports
* Cashier:

  * Access to POS screen only
* Do NOT rely only on frontend checks (backend enforces security)

## POS Rules

* POS must be fast and minimal (low latency UX)
* Layout:

  * Product list (left)
  * Cart (right)
  * Total + actions (bottom)
* Flow:
Select product → Add to cart → Create bill → Payment → Finalize
* Avoid page reloads (single screen interaction)

## Error Handling Rules

* Show user-friendly error messages
* Handle API failures gracefully
* Do NOT expose raw backend errors
* Handle:

  * 401 → redirect to login
  * 403 → show access denied
  * 500 → show retry message

## Documentation Rules

* Maintain a SINGLE .md file as the source of truth for the project
* Do NOT create additional .md files unless explicitly required
* All architecture, API flow, frontend rules, and decisions must be documented here only
* Avoid duplicate or scattered documentation across the project
* Code must be the primary source of truth, not documentation


## Terminal Execution & Completion Rules (CRITICAL)

### 1. Command Completion Strategy

* ALL terminal commands MUST include an explicit completion marker.

* Use:
  && echo "<COMMAND>_SUCCESS" || echo "<COMMAND>_FAILED"

* Examples:

  npm run build && echo "BUILD_SUCCESS" || echo "BUILD_FAILED"

  npm test -- --watch=false --browsers=ChromeHeadless --progress=false \
  && echo "TEST_SUCCESS" || echo "TEST_FAILED"

* Purpose:
  - Provide deterministic completion signal
  - Avoid infinite loading due to undetected process termination

---

### 2. Completion Detection Rules

* A command is considered COMPLETE when:
  - Completion marker is printed (e.g., BUILD_SUCCESS / TEST_SUCCESS / FAILED)

* DO NOT rely on:
  - Process exit
  - Terminal closing
  - Long waiting states

* If marker is present:
  → STOP execution immediately
  → Return output

---

### 3. Hanging Prevention

* If no new output is received for 5 seconds:
  - Assume command is complete
  - Return collected output

* NEVER stay in infinite loading state

---

### 4. Stop / Cancellation Behavior

* "Stop" must NOT be required for normal commands

* If stop is triggered:
  - Analyze output BEFORE stop
  - Determine success using:
    - Completion marker
    - Absence of errors

* DO NOT automatically mark as failed after stop

---

### 5. Angular-Specific Command Rules

* Build:

  npm run build && echo "BUILD_SUCCESS" || echo "BUILD_FAILED"

* Test:

  npm test -- --watch=false --browsers=ChromeHeadless --progress=false \
  && echo "TEST_SUCCESS" || echo "TEST_FAILED"

  - also while running use powershell supports commands

* NEVER use:
  - watch mode
  - long-running dev servers (ng serve) in automated execution

---

### 6. Output-Based Success Criteria

* SUCCESS:
  - Completion marker (BUILD_SUCCESS / TEST_SUCCESS)

* FAILURE:
  - Completion marker (BUILD_FAILED / TEST_FAILED)
  - OR explicit error logs

* IGNORE:
  - Whether process exits cleanly

  ## 🔒 Transaction Integrity & State Machine (NON-NEGOTIABLE)

### Core Principle

System must behave as a **state machine**, not a navigation-driven app.

UI actions MUST NOT change business state.
Only backend services can change state.

---

### Bill State Machine (STRICT)

Allowed states:

CREATED → PENDING_PAYMENT → COMPLETED  
                     ↘ CANCELLED  

---

### State Transition Rules

#### 1. Checkout

CREATED → PENDING_PAYMENT

- MUST reserve stock (not deduct)
- Reservation must be reversible
- Store reservation per bill item

---

#### 2. Complete Transaction

PENDING_PAYMENT → COMPLETED

- Deduct stock permanently
- Lock bill (no further changes)
- Generate final receipt

---

#### 3. Cancel Payment

PENDING_PAYMENT → CANCELLED

- MUST restore reserved stock
- MUST be idempotent (safe if called multiple times)
- MUST NOT fail partially

---

### 🚫 STRICTLY FORBIDDEN

- Deducting stock at checkout
- Changing bill state via frontend navigation
- Treating "view bill" as "completed bill"
- Skipping payment and marking bill as valid

---

### 🔁 Inventory Consistency Model

Each product must support:

- AvailableStock
- ReservedStock

Rules:

Checkout:
- AvailableStock -= qty
- ReservedStock += qty

Cancel:
- AvailableStock += qty
- ReservedStock -= qty

Complete:
- ReservedStock -= qty

---

### 🔐 Invariant Guarantees (MANDATORY)

System must ALWAYS guarantee:

1. AvailableStock + ReservedStock = TotalStock
2. Cancel restores full stock
3. No payment → no stock deduction
4. Navigation does NOT change data

---

### 🧪 Idempotency Rules

All critical operations must be safe to retry:

- Cancel → multiple calls = same result
- Finalize → cannot double deduct
- Events → must include MessageId

---

### ⚠️ Failure Safety

System must NEVER leave partial state:

If failure occurs:
- Rollback stock changes
- Keep bill in previous valid state

---

## 🚫 UI Safety Rules (POS CRITICAL)

### Payment Screen Restrictions

During PENDING_PAYMENT:

Allowed:
- Complete Transaction
- Cancel Payment

Restricted:
- Return to Bill (must be guarded)

---

### Return to Bill Behavior

If user clicks:

"Return to Bill"

System must:

- Show confirmation:
  "Payment not completed. This bill will remain pending."

- Navigate WITHOUT:
  - changing bill status
  - deducting stock

---

### Bill View Rules

If bill.status != COMPLETED:

UI must:
- Show "Pending Payment"
- Disable:
  - Receipt generation
  - Final confirmation indicators

---

### UI Must NEVER:

- Trigger business logic implicitly
- Deduct stock
- Change bill state

---

## 🧠 Backend Validation (HARD ENFORCEMENT)

Every endpoint must validate state:

### Finalize:
- Only if status == PENDING_PAYMENT

### Cancel:
- Only if status == PENDING_PAYMENT

### Reject:
- Invalid transitions
- Already completed bills
- Already cancelled bills

---

## ⚡ Concurrency & Race Condition Protection

- Use DB transactions for:
  - stock reservation
  - finalization
  - cancellation

- Prevent:
  - double checkout
  - double finalize
  - concurrent stock corruption

---

## 🧪 Future Risk Prevention

System must be safe against:

- double clicks
- network retries
- partial API failures
- stale UI state
- concurrent users

---

## 🎯 Final System Guarantee

A sale is valid ONLY if:

- Payment completed
- Stock deducted
- Bill finalized

Everything else is temporary and reversible.