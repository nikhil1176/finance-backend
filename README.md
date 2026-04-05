# Finance Data Processing and Access Control Backend

A RESTful API backend for a finance dashboard system with role-based access control, financial record management, and analytics.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite (via better-sqlite3)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Testing**: Jest + Supertest

## Architecture

```
src/
├── config/         # Database configuration and initialization
├── middleware/      # Auth, RBAC, validation, error handling, rate limiting
├── models/         # Data access layer (User, FinancialRecord, AuditLog)
├── routes/         # Express route definitions
├── services/       # Business logic layer
├── validators/     # Input validation functions
└── utils/          # Shared utilities (ApiError, ApiResponse, constants)
```

### Design Decisions

1. **Layered Architecture**: Routes → Services → Models for clear separation of concerns
2. **Permission-based RBAC**: Instead of simple role checks, uses a permission matrix (`constants.js`) that maps roles to specific action permissions
3. **SQLite**: Chosen for zero-config setup and portability. WAL mode enabled for performance
4. **Soft Delete**: Financial records support soft deletion with restore capability
5. **Audit Logging**: All mutations are tracked with user, action, and timestamp
6. **First User = Admin**: The first registered user automatically gets admin role

## Quick Start

### Prerequisites
- Node.js >= 16

### Setup

```bash
# Clone and install
git clone <repo-url>
cd finance-backend
npm install

# Create environment file
cp .env.example .env
# (or the .env is already provided)

# Seed the database with sample data
npm run seed

# Start the development server
npm run dev
```

The server starts at `http://localhost:3000`

### Seed Users (after running `npm run seed`)

| Email                | Password      | Role    |
|----------------------|---------------|---------|
| admin@finance.com    | password123   | Admin   |
| analyst@finance.com  | password123   | Analyst |
| viewer@finance.com   | password123   | Viewer  |

## API Documentation

Visit `GET http://localhost:3000/api` for full interactive API documentation.

### Authentication

All protected endpoints require a Bearer token:
```
Authorization: Bearer <your-jwt-token>
```

### Endpoints Summary

#### Auth
| Method | Endpoint             | Access        | Description            |
|--------|----------------------|---------------|------------------------|
| POST   | /api/auth/register   | Public        | Register new user      |
| POST   | /api/auth/login      | Public        | Login                  |
| GET    | /api/auth/me         | Authenticated | Get profile            |
| PUT    | /api/auth/me         | Authenticated | Update own profile     |

#### Users (Admin only)
| Method | Endpoint                   | Description              |
|--------|----------------------------|--------------------------|
| GET    | /api/users                 | List users (with search, filter, pagination) |
| GET    | /api/users/:id             | Get user by ID           |
| POST   | /api/users                 | Create user              |
| PUT    | /api/users/:id             | Update user              |
| DELETE | /api/users/:id             | Delete user              |
| GET    | /api/users/:id/audit-logs  | Get user's audit trail   |

#### Financial Records
| Method | Endpoint                    | Access  | Description                        |
|--------|-----------------------------|---------|------------------------------------|
| GET    | /api/records                | All     | List records (filter, sort, paginate) |
| GET    | /api/records/:id            | All     | Get single record                  |
| POST   | /api/records                | Admin   | Create record                      |
| PUT    | /api/records/:id            | Admin   | Update record                      |
| DELETE | /api/records/:id            | Admin   | Soft delete (?hard=true for permanent) |
| POST   | /api/records/:id/restore    | Admin   | Restore soft-deleted record        |

#### Dashboard
| Method | Endpoint                       | Access          | Description               |
|--------|--------------------------------|-----------------|---------------------------|
| GET    | /api/dashboard/overview        | All             | Summary + top categories  |
| GET    | /api/dashboard/categories      | All             | Category breakdown        |
| GET    | /api/dashboard/trends/monthly  | All             | Monthly trends            |
| GET    | /api/dashboard/trends/weekly   | All             | Weekly trends             |
| GET    | /api/dashboard/trends/daily    | All             | Daily trends              |
| GET    | /api/dashboard/recent          | All             | Recent activity           |
| GET    | /api/dashboard/analytics       | Analyst + Admin | Advanced analytics        |

### Filtering Records

```
GET /api/records?type=expense&category=rent&dateFrom=2025-01-01&dateTo=2025-03-31&minAmount=100&maxAmount=2000&sortBy=amount&sortOrder=DESC&page=1&limit=10&search=monthly
```

## Role Permissions

| Permission          | Viewer | Analyst | Admin |
|---------------------|--------|---------|-------|
| View records        | ✅     | ✅      | ✅    |
| View dashboard      | ✅     | ✅      | ✅    |
| Access analytics    | ❌     | ✅      | ✅    |
| Create records      | ❌     | ❌      | ✅    |
| Update records      | ❌     | ❌      | ✅    |
| Delete records      | ❌     | ❌      | ✅    |
| Manage users        | ❌     | ❌      | ✅    |

## Running Tests

```bash
npm test
```

Tests cover:
- Authentication (register, login, profile, token validation)
- Financial Records (CRUD, validation, RBAC, soft delete/restore, filtering)
- Dashboard (overview, categories, trends, analytics, role restrictions)

## Features Implemented

### Core
- ✅ User registration and authentication (JWT)
- ✅ Role-based access control (Viewer, Analyst, Admin)
- ✅ Financial records CRUD with validation
- ✅ Dashboard summary APIs (totals, trends, categories)
- ✅ Input validation with detailed error messages
- ✅ Proper HTTP status codes

### Optional Enhancements
- ✅ JWT token authentication
- ✅ Pagination for all list endpoints
- ✅ Search support (records, users)
- ✅ Soft delete with restore
- ✅ Rate limiting
- ✅ Unit/Integration tests
- ✅ Self-documenting API (`GET /api`)
- ✅ Audit logging
- ✅ Seed script for demo data
- ✅ Graceful shutdown handling

## Assumptions

1. **First registered user becomes admin** — simplifies initial setup without a separate admin creation flow
2. **Categories are predefined** — ensures data consistency for dashboard analytics
3. **SQLite** — chosen for zero-config portability; easily swappable for PostgreSQL/MySQL
4. **All financial amounts are positive** — the `type` field (income/expense) determines the direction
5. **Dates are stored as strings (YYYY-MM-DD)** — sufficient for daily-level financial tracking
6. **Audit logs are immutable** — no update/delete operations on audit entries

## Tradeoffs

- **SQLite vs PostgreSQL**: Simpler setup but limited concurrency. Adequate for assessment scope.
- **Synchronous DB operations**: `better-sqlite3` is synchronous by design, which simplifies the code but blocks the event loop on heavy queries. Acceptable for this scale.
- **In-memory permission matrix vs DB-stored permissions**: Chose in-memory for simplicity and performance. A production system might store permissions in the database for runtime flexibility.