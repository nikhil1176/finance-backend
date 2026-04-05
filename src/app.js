const express = require('express');
const cors = require('cors');
const { generalLimiter } = require('./middleware/rateLimiter');
const { errorHandler } = require('./middleware/errorHandler');
const ApiError = require('./utils/ApiError');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const recordRoutes = require('./routes/record.routes');
const dashboardRoutes = require('./routes/dashboard.routes');

const app = express();

// ─── Global Middleware ───────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(generalLimiter);

// Request logging in development
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    });
    next();
  });
}

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Finance Backend API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// ─── API Documentation Endpoint ──────────────────────
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Finance Data Processing & Access Control API',
    version: '1.0.0',
    documentation: {
      auth: {
        'POST /api/auth/register': {
          description: 'Register a new user (first user becomes admin)',
          body: { email: 'string', password: 'string (min 8 chars)', firstName: 'string', lastName: 'string' },
          access: 'Public',
        },
        'POST /api/auth/login': {
          description: 'Login with email and password',
          body: { email: 'string', password: 'string' },
          access: 'Public',
        },
        'GET /api/auth/me': {
          description: 'Get current user profile',
          access: 'Authenticated',
        },
        'PUT /api/auth/me': {
          description: 'Update own profile',
          body: { firstName: 'string (optional)', lastName: 'string (optional)', password: 'string (optional)' },
          access: 'Authenticated',
        },
      },
      users: {
        'GET /api/users': {
          description: 'List all users with pagination and filters',
          query: { page: 'number', limit: 'number', role: 'admin|analyst|viewer', status: 'active|inactive', search: 'string' },
          access: 'Admin only',
        },
        'GET /api/users/:id': {
          description: 'Get user by ID',
          access: 'Admin only',
        },
        'POST /api/users': {
          description: 'Create a new user',
          body: { email: 'string', password: 'string', firstName: 'string', lastName: 'string', role: 'admin|analyst|viewer (optional)', status: 'active|inactive (optional)' },
          access: 'Admin only',
        },
        'PUT /api/users/:id': {
          description: 'Update a user',
          body: { firstName: 'string (optional)', lastName: 'string (optional)', role: 'string (optional)', status: 'string (optional)', password: 'string (optional)' },
          access: 'Admin only',
        },
        'DELETE /api/users/:id': {
          description: 'Delete a user',
          access: 'Admin only',
        },
        'GET /api/users/:id/audit-logs': {
          description: 'Get audit logs for a specific user',
          access: 'Admin only',
        },
      },
      records: {
        'GET /api/records': {
          description: 'List financial records with filters, pagination, sorting',
          query: {
            page: 'number', limit: 'number', type: 'income|expense',
            category: 'string', dateFrom: 'YYYY-MM-DD', dateTo: 'YYYY-MM-DD',
            minAmount: 'number', maxAmount: 'number', search: 'string',
            sortBy: 'date|amount|type|category|created_at', sortOrder: 'ASC|DESC',
          },
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/records/:id': {
          description: 'Get a single financial record',
          access: 'Viewer, Analyst, Admin',
        },
        'POST /api/records': {
          description: 'Create a financial record',
          body: {
            amount: 'number (positive)', type: 'income|expense',
            category: 'string (from allowed list)', date: 'YYYY-MM-DD',
            description: 'string (optional)',
          },
          access: 'Admin only',
        },
        'PUT /api/records/:id': {
          description: 'Update a financial record',
          body: { amount: 'number (optional)', type: 'string (optional)', category: 'string (optional)', date: 'YYYY-MM-DD (optional)', description: 'string (optional)' },
          access: 'Admin only',
        },
        'DELETE /api/records/:id': {
          description: 'Soft delete a financial record (use ?hard=true for permanent)',
          query: { hard: 'true|false' },
          access: 'Admin only',
        },
        'POST /api/records/:id/restore': {
          description: 'Restore a soft-deleted financial record',
          access: 'Admin only',
        },
      },
      dashboard: {
        'GET /api/dashboard/overview': {
          description: 'Get dashboard overview (totals, top categories, recent activity)',
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/dashboard/categories': {
          description: 'Get category-wise breakdown',
          query: { type: 'income|expense (optional)' },
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/dashboard/trends/monthly': {
          description: 'Get monthly income/expense trends',
          query: { months: 'number (default 12)' },
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/dashboard/trends/weekly': {
          description: 'Get weekly income/expense trends',
          query: { weeks: 'number (default 12)' },
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/dashboard/trends/daily': {
          description: 'Get daily income/expense trends',
          query: { days: 'number (default 30)' },
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/dashboard/recent': {
          description: 'Get recent financial activity',
          query: { limit: 'number (default 10)' },
          access: 'Viewer, Analyst, Admin',
        },
        'GET /api/dashboard/analytics': {
          description: 'Get advanced analytics (includes user stats, MoM changes)',
          access: 'Analyst, Admin only',
        },
      },
    },
    roles: {
      viewer: 'Can view records and basic dashboard data',
      analyst: 'Can view records, dashboard data, and access advanced analytics',
      admin: 'Full access: create/update/delete records and manage users',
    },
    categories: [
      'salary', 'freelance', 'investment', 'rent', 'utilities',
      'groceries', 'transport', 'entertainment', 'healthcare',
      'education', 'shopping', 'travel', 'food', 'insurance', 'taxes', 'other',
    ],
  });
});

// ─── Routes ──────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/dashboard', dashboardRoutes);

// ─── 404 Handler ─────────────────────────────────────
app.use((req, res, next) => {
  next(ApiError.notFound(`Route ${req.method} ${req.url} not found`));
});

// ─── Error Handler ───────────────────────────────────
app.use(errorHandler);

module.exports = app;