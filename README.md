# Finance Data Processing and Access Control Backend

A RESTful API backend for a finance dashboard system with role-based access control, financial record management, and analytics.

## 🌐 Live Demo

| Link | URL |
|------|-----|
| **📄 API Documentation (Swagger)** | [https://finance-backend-ptmt.onrender.com/api-docs](https://finance-backend-ptmt.onrender.com/api-docs) |
| **🌐 Live API** | [https://finance-backend-ptmt.onrender.com/api](https://finance-backend-ptmt.onrender.com/api) |
| **💚 Health Check** | [https://finance-backend-ptmt.onrender.com/api/health](https://finance-backend-ptmt.onrender.com/api/health) |

### Test Credentials (Pre-seeded)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@finance.com | password123 |
| Analyst | analyst@finance.com | password123 |
| Viewer | viewer@finance.com | password123 |

### How to Test on Swagger UI
1. Open [API Docs](https://finance-backend-ptmt.onrender.com/api-docs)
2. Use **POST /api/auth/login** with test credentials to get a token
3. Click the **🔒 Authorize** button at the top
4. Paste the token (without "Bearer" prefix — Swagger adds it automatically)
5. Click **Authorize** → **Close**
6. Now test any endpoint!

> ⚠️ **Note:** Render free tier may take 30-50 seconds to wake up on first request after inactivity.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** SQLite (via sql.js)
- **Authentication:** JWT (jsonwebtoken)
- **Password Hashing:** bcryptjs
- **API Docs:** Swagger UI
- **Testing:** Jest + Supertest

## Architecture

src/
├── config/ # Database configuration and initialization
├── middleware/ # Auth, RBAC, validation, error handling, rate limiting
├── models/ # Data access layer (User, FinancialRecord, AuditLog)
├── routes/ # Express route definitions
├── services/ # Business logic layer
├── validators/ # Input validation functions
└── utils/ # Shared utilities (ApiError, ApiResponse, constants)
```


### Design Decisions

1. **Layered Architecture:** Routes → Services → Models for clear separation of concerns
2. **Permission-based RBAC:** Uses a permission matrix that maps roles to specific action permissions
3. **SQLite via sql.js:** Chosen for zero-config setup, portability, and deployment compatibility
4. **Soft Delete:** Financial records support soft deletion with restore capability
5. **Audit Logging:** All mutations are tracked with user, action, and timestamp
6. **First User = Admin:** The first registered user automatically gets admin role
7. **Auto-Seed:** Database automatically seeds with sample data on first run

---

## Quick Start (Local Development)

### Prerequisites
- Node.js >= 16

## Setup

```bash
# Clone and install
git clone https://github.com/nikhil1176/finance-backend.git
cd finance-backend
npm install

# Create environment file
cp .env.example .env

# Seed the database with sample data
npm run seed

# Start the development server
npm run dev
```

The server starts at http://localhost:3000

API Docs available at http://localhost:3000/api-docs

## API Documentation
Authentication
All protected endpoints require a Bearer token:
Authorization: Bearer <your-jwt-token>

## Endpoints Summary

Auth

Method	Endpoint	Access	Description
POST	/api/auth/register	Public	Register new user
POST	/api/auth/login	Public	Login
GET	/api/auth/me	Authenticated	Get profile
PUT	/api/auth/me	Authenticated	Update own profile

# Users (Admin only)

Method	Endpoint	Description
GET	/api/users	List users (with search, filter, pagination)
GET	/api/users/:id	Get user by ID
POST	/api/users	Create user
PUT	/api/users/:id	Update user
DELETE	/api/users/:id	Delete user
GET	/api/users/:id/audit-logs	Get user's audit trail

# Financial Records

Method	Endpoint	Access	Description
GET	/api/records	All	List records (filter, sort, paginate)
GET	/api/records/:id	All	Get single record
POST	/api/records	Admin	Create record
PUT	/api/records/:id	Admin	Update record
DELETE	/api/records/:id	Admin	Soft delete (?hard=true for permanent)
POST	/api/records/:id/restore	Admin	Restore soft-deleted record

# Dashboard

Method	Endpoint	Access	Description
GET	/api/dashboard/overview	All	Summary + top categories
GET	/api/dashboard/categories	All	Category breakdown
GET	/api/dashboard/trends/monthly	All	Monthly trends
GET	/api/dashboard/trends/weekly	All	Weekly trends
GET	/api/dashboard/trends/daily	All	Daily trends
GET	/api/dashboard/recent	All	Recent activity
GET	/api/dashboard/analytics	Analyst + Admin	Advanced analytics

# Filtering Records

GET /api/records?type=expense&category=rent&dateFrom=2025-01-01&dateTo=2025-03-31&minAmount=100&maxAmount=2000&sortBy=amount&sortOrder=DESC&page=1&limit=10&search=monthly

### Role Permissions
Permission	Viewer	Analyst	Admin
View records	✅	✅	✅
View dashboard	✅	✅	✅
Access analytics	❌	✅	✅
Create records	❌	❌	✅
Update records	❌	❌	✅
Delete records	❌	❌	✅
Manage users	❌	❌	✅

## Running Tests

npm test

Tests cover:

1.Authentication (register, login, profile, token validation)
2.Financial Records (CRUD, validation, RBAC, soft delete/restore, filtering)
3.Dashboard (overview, categories, trends, analytics, role restrictions)

### Features Implemented

Core

✅ User registration and authentication (JWT)
✅ Role-based access control (Viewer, Analyst, Admin)
✅ Financial records CRUD with validation
✅ Dashboard summary APIs (totals, trends, categories)
✅ Input validation with detailed error messages
✅ Proper HTTP status codes

## Optional Enhancements
✅ JWT token authentication
✅ Pagination for all list endpoints
✅ Search support (records, users)
✅ Soft delete with restore
✅ Rate limiting
✅ Unit/Integration tests
✅ Swagger API documentation
✅ Audit logging
✅ Seed script for demo data
✅ Graceful shutdown handling
✅ Live deployment on Render.com

## Assumptions
1.First registered user becomes admin — simplifies initial setup

2.Categories are predefined — ensures data consistency for analytics

3.SQLite via sql.js — chosen for zero-config portability and deployment compatibility

4.All financial amounts are positive — the type field (income/expense) determines direction

5.Dates are stored as strings (YYYY-MM-DD) — sufficient for daily-level tracking

6.Audit logs are immutable — no update/delete operations on audit entries


## Tradeoffs
1.sql.js vs PostgreSQL: Simpler setup but limited concurrency and ephemeral on free hosting. Adequate for assessment scope.

2.In-memory permission matrix vs DB-stored permissions: Chose in-memory for simplicity and performance. Production system might store permissions in database for runtime flexibility.

3.SQLite on Render free tier: Database resets on redeployment. Auto-seed handles this gracefully. For production, PostgreSQL with persistent storage would be used.