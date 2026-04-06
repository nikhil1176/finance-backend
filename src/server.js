require('dotenv').config();
const app = require('./app');
const { initDatabase, getDatabase, saveDatabase, closeDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await initDatabase();
    console.log('✅ Database initialized successfully');

    const db = getDatabase();
    const result = db.exec('SELECT COUNT(*) as count FROM users');
    const userCount = result.length > 0 ? result[0].values[0][0] : 0;

    if (userCount === 0) {
      console.log('📦 Empty database, running seed...');
      await runSeed(db);
      saveDatabase();
    } else {
      console.log(`📊 Database has ${userCount} users`);
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`📄 API Docs: http://localhost:${PORT}/api-docs`);
    });

    function gracefulShutdown(signal) {
      console.log(`${signal} received. Shutting down...`);
      server.close(() => { closeDatabase(); process.exit(0); });
      setTimeout(() => process.exit(1), 10000);
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('uncaughtException', (err) => { console.error('Uncaught:', err); gracefulShutdown('ERROR'); });
    process.on('unhandledRejection', (reason) => { console.error('Unhandled:', reason); });

  } catch (error) {
    console.error('❌ Failed to start:', error);
    process.exit(1);
  }
}

async function runSeed(db) {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  const passwordHash = await bcrypt.hash('password123', 12);
  const now = new Date().toISOString();
  const adminId = uuidv4(), analystId = uuidv4(), viewerId = uuidv4();

  db.run(`INSERT INTO users (id,email,password_hash,first_name,last_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [adminId, 'admin@finance.com', passwordHash, 'Admin', 'User', 'admin', 'active', now, now]);
  db.run(`INSERT INTO users (id,email,password_hash,first_name,last_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [analystId, 'analyst@finance.com', passwordHash, 'Analyst', 'User', 'analyst', 'active', now, now]);
  db.run(`INSERT INTO users (id,email,password_hash,first_name,last_name,role,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [viewerId, 'viewer@finance.com', passwordHash, 'Viewer', 'User', 'viewer', 'active', now, now]);

  const records = [
    { amount: 5000, type: 'income', category: 'salary', description: 'Salary January', date: '2025-01-15' },
    { amount: 5000, type: 'income', category: 'salary', description: 'Salary February', date: '2025-02-15' },
    { amount: 5000, type: 'income', category: 'salary', description: 'Salary March', date: '2025-03-15' },
    { amount: 5200, type: 'income', category: 'salary', description: 'Salary April', date: '2025-04-15' },
    { amount: 1200, type: 'income', category: 'freelance', description: 'Web dev project', date: '2025-01-20' },
    { amount: 800, type: 'income', category: 'freelance', description: 'Logo design', date: '2025-02-10' },
    { amount: 1500, type: 'income', category: 'freelance', description: 'Consulting', date: '2025-03-05' },
    { amount: 350, type: 'income', category: 'investment', description: 'Dividends', date: '2025-03-31' },
    { amount: 200, type: 'income', category: 'investment', description: 'Interest', date: '2025-02-28' },
    { amount: 450, type: 'income', category: 'investment', description: 'Dividends Q2', date: '2025-04-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent Jan', date: '2025-01-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent Feb', date: '2025-02-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent Mar', date: '2025-03-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Rent Apr', date: '2025-04-01' },
    { amount: 120, type: 'expense', category: 'utilities', description: 'Electricity', date: '2025-01-10' },
    { amount: 85, type: 'expense', category: 'utilities', description: 'Water', date: '2025-01-12' },
    { amount: 450, type: 'expense', category: 'groceries', description: 'Groceries', date: '2025-01-07' },
    { amount: 380, type: 'expense', category: 'groceries', description: 'Groceries', date: '2025-01-14' },
    { amount: 60, type: 'expense', category: 'transport', description: 'Bus pass', date: '2025-01-01' },
    { amount: 150, type: 'expense', category: 'entertainment', description: 'Concert', date: '2025-01-25' },
    { amount: 300, type: 'expense', category: 'healthcare', description: 'Doctor', date: '2025-02-05' },
    { amount: 250, type: 'expense', category: 'education', description: 'Course', date: '2025-01-10' },
    { amount: 350, type: 'expense', category: 'shopping', description: 'Clothes', date: '2025-01-20' },
    { amount: 250, type: 'expense', category: 'food', description: 'Restaurants', date: '2025-01-30' },
    { amount: 150, type: 'expense', category: 'insurance', description: 'Health insurance', date: '2025-01-05' },
    { amount: 500, type: 'expense', category: 'taxes', description: 'Quarterly tax', date: '2025-03-15' },
    { amount: 800, type: 'expense', category: 'travel', description: 'Flights', date: '2025-03-10' },
  ];

  for (const r of records) {
    const rNow = new Date(r.date + 'T10:00:00Z').toISOString();
    db.run(`INSERT INTO financial_records (id,user_id,amount,type,category,description,date,is_deleted,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)`,
      [uuidv4(), adminId, r.amount, r.type, r.category, r.description, r.date, rNow, rNow]);
  }
  console.log(`✅ Seeded 3 users and ${records.length} records`);
}

startServer();