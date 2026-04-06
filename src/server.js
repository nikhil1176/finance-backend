require('dotenv').config();
const app = require('./app');
const { getDatabase, closeDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function initializeDatabase() {
  try {
    const db = getDatabase();
    console.log('✅ Database initialized successfully');

    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    if (userCount === 0) {
      console.log('📦 Empty database detected, running seed...');
      await runSeed(db);
    } else {
      console.log(`📊 Database has ${userCount} users`);
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

async function runSeed(db) {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');

  const passwordHash = await bcrypt.hash('password123', 12);
  const now = new Date().toISOString();

  const adminId = uuidv4();
  const analystId = uuidv4();
  const viewerId = uuidv4();

  const insertUser = db.prepare(
    `INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  insertUser.run(adminId, 'admin@finance.com', passwordHash, 'Admin', 'User', 'admin', 'active', now, now);
  insertUser.run(analystId, 'analyst@finance.com', passwordHash, 'Analyst', 'User', 'analyst', 'active', now, now);
  insertUser.run(viewerId, 'viewer@finance.com', passwordHash, 'Viewer', 'User', 'viewer', 'active', now, now);

  const insertRecord = db.prepare(
    `INSERT INTO financial_records (id, user_id, amount, type, category, description, date, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );

  const records = [
    { amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary - January', date: '2025-01-15' },
    { amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary - February', date: '2025-02-15' },
    { amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary - March', date: '2025-03-15' },
    { amount: 5200, type: 'income', category: 'salary', description: 'Monthly salary - April', date: '2025-04-15' },
    { amount: 1200, type: 'income', category: 'freelance', description: 'Web development project', date: '2025-01-20' },
    { amount: 800, type: 'income', category: 'freelance', description: 'Logo design', date: '2025-02-10' },
    { amount: 1500, type: 'income', category: 'freelance', description: 'Consulting', date: '2025-03-05' },
    { amount: 350, type: 'income', category: 'investment', description: 'Dividends Q1', date: '2025-03-31' },
    { amount: 200, type: 'income', category: 'investment', description: 'Interest', date: '2025-02-28' },
    { amount: 450, type: 'income', category: 'investment', description: 'Dividends Q2', date: '2025-04-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent January', date: '2025-01-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent February', date: '2025-02-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent March', date: '2025-03-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent April', date: '2025-04-01' },
    { amount: 120, type: 'expense', category: 'utilities', description: 'Electricity', date: '2025-01-10' },
    { amount: 85, type: 'expense', category: 'utilities', description: 'Water', date: '2025-01-12' },
    { amount: 135, type: 'expense', category: 'utilities', description: 'Electricity', date: '2025-02-10' },
    { amount: 450, type: 'expense', category: 'groceries', description: 'Weekly groceries', date: '2025-01-07' },
    { amount: 380, type: 'expense', category: 'groceries', description: 'Weekly groceries', date: '2025-01-14' },
    { amount: 420, type: 'expense', category: 'groceries', description: 'Weekly groceries', date: '2025-02-07' },
    { amount: 60, type: 'expense', category: 'transport', description: 'Bus pass', date: '2025-01-01' },
    { amount: 150, type: 'expense', category: 'entertainment', description: 'Concert', date: '2025-01-25' },
    { amount: 50, type: 'expense', category: 'entertainment', description: 'Movie', date: '2025-02-14' },
    { amount: 300, type: 'expense', category: 'healthcare', description: 'Doctor', date: '2025-02-05' },
    { amount: 250, type: 'expense', category: 'education', description: 'Online course', date: '2025-01-10' },
    { amount: 350, type: 'expense', category: 'shopping', description: 'Clothes', date: '2025-01-20' },
    { amount: 250, type: 'expense', category: 'food', description: 'Restaurants', date: '2025-01-30' },
    { amount: 180, type: 'expense', category: 'food', description: 'Restaurants', date: '2025-02-28' },
    { amount: 150, type: 'expense', category: 'insurance', description: 'Health insurance', date: '2025-01-05' },
    { amount: 150, type: 'expense', category: 'insurance', description: 'Health insurance', date: '2025-02-05' },
    { amount: 500, type: 'expense', category: 'taxes', description: 'Quarterly tax', date: '2025-03-15' },
    { amount: 800, type: 'expense', category: 'travel', description: 'Flight tickets', date: '2025-03-10' },
  ];

  const insertRecords = db.transaction(() => {
    for (const r of records) {
      const rNow = new Date(r.date + 'T10:00:00Z').toISOString();
      insertRecord.run(uuidv4(), adminId, r.amount, r.type, r.category, r.description, r.date, rNow, rNow);
    }
  });
  insertRecords();

  console.log(`✅ Seeded 3 users and ${records.length} financial records`);
}

initializeDatabase().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   Finance Backend API Server                      ║
  ║   Running on: http://localhost:${PORT}              ║
  ║   API Docs:   http://localhost:${PORT}/api-docs     ║
  ║   Environment: ${(process.env.NODE_ENV || 'development').padEnd(16)}         ║
  ╚═══════════════════════════════════════════════════╝
    `);
  });

  function gracefulShutdown(signal) {
    console.log(`\n${signal} received. Shutting down...`);
    server.close(() => {
      closeDatabase();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  }

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
  });
});