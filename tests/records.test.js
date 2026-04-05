const request = require('supertest');
const app = require('../src/app');
const { closeDatabase } = require('../src/config/database');

let adminToken, viewerToken, recordId;

beforeAll(async () => {
  process.env.JWT_SECRET = 'test-secret-key-records';
  process.env.DB_PATH = ':memory:';

  // Register admin (first user)
  const adminRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'admin@records.com', password: 'password123', firstName: 'Admin', lastName: 'User' });
  adminToken = adminRes.body.data.token;

  // Register viewer (second user)
  const viewerRes = await request(app)
    .post('/api/auth/register')
    .send({ email: 'viewer@records.com', password: 'password123', firstName: 'Viewer', lastName: 'User' });
  viewerToken = viewerRes.body.data.token;
});

afterAll(() => {
  closeDatabase();
});

describe('Financial Records API', () => {
  describe('POST /api/records', () => {
    it('admin should create a record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 5000,
          type: 'income',
          category: 'salary',
          description: 'Monthly salary',
          date: '2025-03-15',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.record.amount).toBe(5000);
      expect(res.body.data.record.type).toBe('income');
      recordId = res.body.data.record.id;
    });

    it('admin should create an expense record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 1500,
          type: 'expense',
          category: 'rent',
          description: 'Monthly rent',
          date: '2025-03-01',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.record.type).toBe('expense');
    });

    it('viewer should NOT create a record', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({
          amount: 100,
          type: 'income',
          category: 'salary',
          date: '2025-03-15',
        });

      expect(res.status).toBe(403);
    });

    it('should reject invalid amount', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: -100,
          type: 'income',
          category: 'salary',
          date: '2025-03-15',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid type', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100,
          type: 'loan',
          category: 'salary',
          date: '2025-03-15',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid category', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100,
          type: 'income',
          category: 'bitcoin_mining',
          date: '2025-03-15',
        });

      expect(res.status).toBe(400);
    });

    it('should reject invalid date format', async () => {
      const res = await request(app)
        .post('/api/records')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          amount: 100,
          type: 'income',
          category: 'salary',
          date: '15-03-2025',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/records', () => {
    it('viewer should read records', async () => {
      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter by type', async () => {
      const res = await request(app)
        .get('/api/records?type=income')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((r) => expect(r.type).toBe('income'));
    });

    it('should filter by category', async () => {
      const res = await request(app)
        .get('/api/records?category=rent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((r) => expect(r.category).toBe('rent'));
    });

    it('should filter by date range', async () => {
      const res = await request(app)
        .get('/api/records?dateFrom=2025-03-01&dateTo=2025-03-31')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('should paginate results', async () => {
      const res = await request(app)
        .get('/api/records?page=1&limit=1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/records/:id', () => {
    it('should get a single record', async () => {
      const res = await request(app)
        .get(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record.id).toBe(recordId);
    });

    it('should return 404 for non-existent record', async () => {
      const res = await request(app)
        .get('/api/records/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/records/:id', () => {
    it('admin should update a record', async () => {
      const res = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 5500, description: 'Updated salary' });

      expect(res.status).toBe(200);
      expect(res.body.data.record.amount).toBe(5500);
    });

    it('viewer should NOT update a record', async () => {
      const res = await request(app)
        .put(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({ amount: 9999 });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/records/:id (soft delete)', () => {
    it('admin should soft delete a record', async () => {
      const res = await request(app)
        .delete(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('soft deleted record should not appear in list', async () => {
      const res = await request(app)
        .get('/api/records')
        .set('Authorization', `Bearer ${adminToken}`);

      const found = res.body.data.find((r) => r.id === recordId);
      expect(found).toBeUndefined();
    });
  });

  describe('POST /api/records/:id/restore', () => {
    it('admin should restore a soft-deleted record', async () => {
      const res = await request(app)
        .post(`/api/records/${recordId}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
    });

    it('restored record should appear in list', async () => {
      const res = await request(app)
        .get(`/api/records/${recordId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.record.id).toBe(recordId);
    });
  });
});