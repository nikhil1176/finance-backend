const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
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
app.set('trust proxy', 1);

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

// ─── Swagger API Documentation (simple setup) ───────
app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocument, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Finance API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      tryItOutEnabled: true,
    },
  })
);

// ─── Health Check ────────────────────────────────────
app.get('/api/health', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseUrl = `${protocol}://${req.get('host')}`;
  res.json({
    success: true,
    message: 'Finance Backend API is running',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    docs: `${baseUrl}/api-docs`,
  });
});

// ─── API Info Endpoint ───────────────────────────────
app.get('/api', (req, res) => {
  const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
  const baseUrl = `${protocol}://${req.get('host')}`;
  res.json({
    success: true,
    message: 'Finance Data Processing & Access Control API',
    version: '1.0.0',
    documentation: `${baseUrl}/api-docs`,
    healthCheck: `${baseUrl}/api/health`,
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me',
        updateProfile: 'PUT /api/auth/me',
      },
      users: {
        list: 'GET /api/users',
        get: 'GET /api/users/:id',
        create: 'POST /api/users',
        update: 'PUT /api/users/:id',
        delete: 'DELETE /api/users/:id',
        auditLogs: 'GET /api/users/:id/audit-logs',
      },
      records: {
        list: 'GET /api/records',
        get: 'GET /api/records/:id',
        create: 'POST /api/records',
        update: 'PUT /api/records/:id',
        delete: 'DELETE /api/records/:id',
        restore: 'POST /api/records/:id/restore',
      },
      dashboard: {
        overview: 'GET /api/dashboard/overview',
        categories: 'GET /api/dashboard/categories',
        monthlyTrends: 'GET /api/dashboard/trends/monthly',
        weeklyTrends: 'GET /api/dashboard/trends/weekly',
        dailyTrends: 'GET /api/dashboard/trends/daily',
        recent: 'GET /api/dashboard/recent',
        analytics: 'GET /api/dashboard/analytics',
      },
    },
    testCredentials: {
      admin: { email: 'admin@finance.com', password: 'password123' },
      analyst: { email: 'analyst@finance.com', password: 'password123' },
      viewer: { email: 'viewer@finance.com', password: 'password123' },
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