require('dotenv').config();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDatabase, closeDatabase } = require('./config/database');

async function seed() {
  console.log('🌱 Starting database seed...\n');
  const db = getDatabase();

  // Clear existing data
  db.exec('DELETE FROM audit_logs');
  db.exec('DELETE FROM financial_records');
  db.exec('DELETE FROM users');
  console.log('🗑️  Cleared existing data');

  // Create users
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

  console.log('👤 Created 3 users:');
  console.log('   admin@finance.com    / password123  (admin)');
  console.log('   analyst@finance.com  / password123  (analyst)');
  console.log('   viewer@finance.com   / password123  (viewer)\n');

  // Create financial records
  const insertRecord = db.prepare(
    `INSERT INTO financial_records (id, user_id, amount, type, category, description, date, is_deleted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
  );

  const records = [
    // Income records
    { amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary - January', date: '2025-01-15' },
    { amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary - February', date: '2025-02-15' },
    { amount: 5000, type: 'income', category: 'salary', description: 'Monthly salary - March', date: '2025-03-15' },
    { amount: 5200, type: 'income', category: 'salary', description: 'Monthly salary - April (raise)', date: '2025-04-15' },
    { amount: 1200, type: 'income', category: 'freelance', description: 'Web development project', date: '2025-01-20' },
    { amount: 800, type: 'income', category: 'freelance', description: 'Logo design work', date: '2025-02-10' },
    { amount: 1500, type: 'income', category: 'freelance', description: 'Mobile app consulting', date: '2025-03-05' },
    { amount: 350, type: 'income', category: 'investment', description: 'Stock dividends Q1', date: '2025-03-31' },
    { amount: 200, type: 'income', category: 'investment', description: 'Interest income', date: '2025-02-28' },
    { amount: 450, type: 'income', category: 'investment', description: 'Stock dividends Q2', date: '2025-04-01' },

    // Expense records
    { amount: 1500, type: 'expense', category: 'rent', description: 'Monthly rent - January', date: '2025-01-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Monthly rent - February', date: '2025-02-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Monthly rent - March', date: '2025-03-01' },
    { amount: 1500, type: 'expense', category: 'rent', description: 'Monthly rent - April', date: '2025-04-01' },
    { amount: 120, type: 'expense', category: 'utilities', description: 'Electricity bill', date: '2025-01-10' },
    { amount: 85, type: 'expense', category: 'utilities', description: 'Water bill', date: '2025-01-12' },
    { amount: 135, type: 'expense', category: 'utilities', description: 'Electricity bill', date: '2025-02-10' },
    { amount: 90, type: 'expense', category: 'utilities', description: 'Water bill', date: '2025-02-12' },
    { amount: 110, type: 'expense', category: 'utilities', description: 'Electricity bill', date: '2025-03-10' },
    { amount: 450, type: 'expense', category: 'groceries', description: 'Weekly groceries', date: '2025-01-07' },
    { amount: 380, type: 'expense', category: 'groceries', description: 'Weekly groceries', date: '2025-01-14' },
    { amount: 420, type: 'expense', category: 'groceries', description: 'Weekly groceries', date: '2025-02-07' },
    { amount: 510, type: 'expense', category: 'groceries', description: 'Monthly bulk shopping', date: '2025-03-01' },
    { amount: 60, type: 'expense', category: 'transport', description: 'Monthly bus pass', date: '2025-01-01' },
    { amount: 60, type: 'expense', category: 'transport', description: 'Monthly bus pass', date: '2025-02-01' },
    { amount: 45, type: 'expense', category: 'transport', description: 'Uber rides', date: '2025-01-18' },
    { amount: 150, type: 'expense', category: 'entertainment', description: 'Concert tickets', date: '2025-01-25' },
    { amount: 50, type: 'expense', category: 'entertainment', description: 'Movie night', date: '2025-02-14' },
    { amount: 200, type: 'expense', category: 'entertainment', description: 'Weekend getaway', date: '2025-03-20' },
    { amount: 300, type: 'expense', category: 'healthcare', description: 'Doctor visit', date: '2025-02-05' },
    { amount: 75, type: 'expense', category: 'healthcare', description: 'Pharmacy', date: '2025-02-06' },
    { amount: 250, type: 'expense', category: 'education', description: 'Online course - React', date: '2025-01-10' },
    { amount: 180, type: 'expense', category: 'education', description: 'Books', date: '2025-03-15' },
    { amount: 350, type: 'expense', category: 'shopping', description: 'Winter clothes', date: '2025-01-20' },
    { amount: 120, type: 'expense', category: 'shopping', description: 'Electronics accessories', date: '2025-03-10' },
    { amount: 250, type: 'expense', category: 'food', description: 'Restaurant dinners (January)', date: '2025-01-30' },
    { amount: 180, type: 'expense', category: 'food', description: 'Restaurant dinners (February)', date: '2025-02-28' },
    { amount: 220, type: 'expense', category: 'food', description: 'Restaurant dinners (March)', date: '2025-03-30' },
    { amount: 150, type: 'expense', category: 'insurance', description: 'Health insurance', date: '2025-01-05' },
    { amount: 150, type: 'expense', category: 'insurance', description: 'Health insurance', date: '2025-02-05' },
    { amount: 150, type: 'expense', category: 'insurance', description: 'Health insurance', date: '2025-03-05' },
    { amount: 500, type: 'expense', category: 'taxes', description: 'Quarterly estimated tax', date: '2025-03-15' },
    { amount: 800, type: 'expense', category: 'travel', description: 'Flight tickets - vacation', date: '2025-03-10' },
    { amount: 400, type: 'expense', category: 'travel', description: 'Hotel booking', date: '2025-03-11' },
  ];

  const insertRecords = db.transaction(() => {
    for (const record of records) {
      const recordNow = new Date(record.date + 'T10:00:00Z').toISOString();
      insertRecord.run(
        uuidv4(), adminId, record.amount, record.type,
        record.category, record.description, record.date,
        recordNow, recordNow
      );
    }
  });

  insertRecords();

  console.log(`📊 Created ${records.length} financial records\n`);

  // Summary
  const summary = db.prepare(`
    SELECT
      COUNT(*) as total_records,
      COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses
    FROM financial_records WHERE is_deleted = 0
  `).get();

  console.log('📈 Summary:');
  console.log(`   Total Records: ${summary.total_records}`);
  console.log(`   Total Income:  
$$
{summary.total_income.toLocaleString()}`);
  console.log(`   Total Expenses:
$$
{summary.total_expenses.toLocaleString()}`);
  console.log(`   Net Balance:   $${(summary.total_income - summary.total_expenses).toLocaleString()}`);

  closeDatabase();
  console.log('\n✅ Seed complete!');
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  closeDatabase();
  process.exit(1);
});