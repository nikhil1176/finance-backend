const request = require('supertest');
const app = require('../src/app');
const { closeDatabase } = require('../src/config/database');

let adminToken, analystToken, viewerToken;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-dashboard';
  process.env.DB_PATH = ':memory:';

  // Register admin
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'admin@dash.com', password: 'password123', firstName: 'Admin', lastName: 'User' });
  adminToken = adminRes.body.data.token;

  // Create analyst via admin
  const analystRes = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ email: 'analyst@dash.com', password: 'password123', firstName: 'Analyst', lastName: 'User', role: 'analyst' });

  // Login as analyst
  const analystLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'analyst@dash.com', password: 'password123' });
  analystToken = analystLogin.body.data.token;

  // Register viewer
  const viewerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'viewer@dash.com', password: 'password123', firstName: 'Viewer', lastName: 'User' });
  viewerToken = viewerRes.body.data.token;

  // Create some records
  const records = [
    { amount: 5000, type: 'income', category: 'salary', date: '2025-03-15', description: 'March salary' },
    { amount: 1200, type: 'income', category: 'freelance', date: '2025-03-20', description: 'Freelance gig' },
    { amount: 1500, type: 'expense', category: 'rent', date: '2025-03-01', description: 'Rent' },
    { amount: 400, type: 'expense', category: 'groceries', date: '2025-03-10', description: 'Groceries' },
    { amount: 200, type: 'expense', category: 'entertainment', date: '2025-03-15', description: 'Fun' },
  ];

  for (const record of records) {
    await request(app)
      .post('/api/records')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(record);
  }
});

afterAll(() => {
  closeDatabase();
});

describe('Dashboard API', () => {
  describe('GET /api/dashboard/overview', () => {
    it('viewer can access overview', async () => {
      const res = await request(app)
        .get('/api/dashboard/overview')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.summary.totalIncome).toBe(6200);
      expect(res.body.data.summary.totalExpenses).toBe(2100);
      expect(res.body.data.summary.netBalance).toBe(4100);
      expect(res.body.data.topExpenseCategories).toBeDefined();
      expect(res.body.data.recentActivity).toBeDefined();
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/dashboard/overview');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/dashboard/categories', () => {
    it('should return category breakdown', async () => {
      const res = await request(app)
        .get('/api/dashboard/categories')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].category).toBeDefined();
      expect(res.body.data[0].percentage).toBeDefined();
    });

    it('should filter by type', async () => {
      const res = await request(app)
        .get('/api/dashboard/categories?type=expense')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((cat) => expect(cat.type).toBe('expense'));
    });
  });

  describe('GET /api/dashboard/trends/monthly', () => {
    it('should return monthly trends', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends/monthly')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/trends/weekly', () => {
    it('should return weekly trends', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends/weekly')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/dashboard/trends/daily', () => {
    it('should return daily trends', async () => {
      const res = await request(app)
        .get('/api/dashboard/trends/daily')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/dashboard/recent', () => {
    it('should return recent activity', async () => {
      const res = await request(app)
        .get('/api/dashboard/recent?limit=3')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(3);
    });
  });

  describe('GET /api/dashboard/analytics', () => {
    it('analyst can access analytics', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${analystToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.summary).toBeDefined();
      expect(res.body.data.userStats).toBeDefined();
      expect(res.body.data.monthlyTrends).toBeDefined();
      expect(res.body.data.categoryBreakdown).toBeDefined();
    });

    it('admin can access analytics', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('viewer CANNOT access analytics', async () => {
      const res = await request(app)
        .get('/api/dashboard/analytics')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(403);
    });
  });
});