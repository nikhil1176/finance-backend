const request = require('supertest');
const app = require('../src/app');
const { getDatabase, closeDatabase } = require('../src/config/database');

// Use in-memory database for tests
beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DB_PATH = ':memory:';
});

afterAll(() => {
  closeDatabase();
});

describe('Auth API', () => {
  let adminToken;

  describe('POST /api/auth/register', () => {
    it('should register the first user as admin', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'password123',
          firstName: 'Admin',
          lastName: 'User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe('admin');
      expect(res.body.data.token).toBeDefined();
      adminToken = res.body.data.token;
    });

    it('should register second user as viewer', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'viewer@test.com',
          password: 'password123',
          firstName: 'Viewer',
          lastName: 'User',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('viewer');
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'admin@test.com',
          password: 'password123',
          firstName: 'Dup',
          lastName: 'User',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'new@test.com',
          password: '123',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(400);
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com' });

      expect(res.status).toBe(400);
      expect(res.body.details.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('admin@test.com');
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'admin@test.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@test.com', password: 'password123' });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('admin@test.com');
    });

    it('should reject without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });
});