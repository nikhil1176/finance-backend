const { getDatabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
  static findAll({ role, status, page = 1, limit = 20, search } = {}) {
    const db = getDatabase();
    let query = 'SELECT id, email, first_name, last_name, role, status, created_at, updated_at FROM users WHERE 1=1';
    const params = [];

    if (role) { query += ' AND role = ?'; params.push(role); }
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (search) {
      query += ' AND (email LIKE ? OR first_name LIKE ? OR last_name LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const countQuery = query.replace(
      'SELECT id, email, first_name, last_name, role, status, created_at, updated_at',
      'SELECT COUNT(*) as total'
    );
    const { total } = db.prepare(countQuery).get(...params);

    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const users = db.prepare(query).all(...params);

    return {
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static findById(id) {
    const db = getDatabase();
    return db.prepare(
      'SELECT id, email, first_name, last_name, role, status, created_at, updated_at FROM users WHERE id = ?'
    ).get(id);
  }

  static findByEmail(email) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static findByEmailWithPassword(email) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  static create({ email, passwordHash, firstName, lastName, role = 'viewer', status = 'active' }) {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, email, passwordHash, firstName, lastName, role, status, now, now);

    return User.findById(id);
  }

  static update(id, fields) {
    const db = getDatabase();
    const allowedFields = ['first_name', 'last_name', 'role', 'status', 'password_hash'];
    const updates = [];
    const params = [];

    const fieldMap = {
      firstName: 'first_name',
      lastName: 'last_name',
      role: 'role',
      status: 'status',
      passwordHash: 'password_hash',
    };

    for (const [key, value] of Object.entries(fields)) {
      const dbField = fieldMap[key] || key;
      if (allowedFields.includes(dbField) && value !== undefined) {
        updates.push(`${dbField} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) return User.findById(id);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);
    return User.findById(id);
  }

  static delete(id) {
    const db = getDatabase();
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
    return result.changes > 0;
  }

  static count(filters = {}) {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const params = [];
    if (filters.role) { query += ' AND role = ?'; params.push(filters.role); }
    if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
    return db.prepare(query).get(...params).count;
  }
}

module.exports = User;