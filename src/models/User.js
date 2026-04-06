const { getDatabase, saveDatabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class User {
  static _mapRows(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

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
    const countResult = db.exec(countQuery, params);
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    const offset = (page - 1) * limit;
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const result = db.exec(query, params);
    const users = User._mapRows(result);

    return {
      users,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  static findById(id) {
    const db = getDatabase();
    const result = db.exec(
      'SELECT id, email, first_name, last_name, role, status, created_at, updated_at FROM users WHERE id = ?', [id]
    );
    const rows = User._mapRows(result);
    return rows[0] || null;
  }

  static findByEmail(email) {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);
    return User._mapRows(result)[0] || null;
  }

  static findByEmailWithPassword(email) {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM users WHERE email = ?', [email]);
    return User._mapRows(result)[0] || null;
  }

  static create({ email, passwordHash, firstName, lastName, role = 'viewer', status = 'active' }) {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO users (id, email, password_hash, first_name, last_name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, email, passwordHash, firstName, lastName, role, status, now, now]
    );
    saveDatabase();
    return User.findById(id);
  }

  static update(id, fields) {
    const db = getDatabase();
    const allowedFields = ['first_name', 'last_name', 'role', 'status', 'password_hash'];
    const updates = [];
    const params = [];
    const fieldMap = { firstName: 'first_name', lastName: 'last_name', role: 'role', status: 'status', passwordHash: 'password_hash' };

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
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
    saveDatabase();
    return User.findById(id);
  }

  static delete(id) {
    const db = getDatabase();
    db.run('DELETE FROM users WHERE id = ?', [id]);
    const changes = db.getRowsModified();
    saveDatabase();
    return changes > 0;
  }

  static count(filters = {}) {
    const db = getDatabase();
    let query = 'SELECT COUNT(*) as count FROM users WHERE 1=1';
    const params = [];
    if (filters.role) { query += ' AND role = ?'; params.push(filters.role); }
    if (filters.status) { query += ' AND status = ?'; params.push(filters.status); }
    const result = db.exec(query, params);
    return result.length > 0 ? result[0].values[0][0] : 0;
  }
}

module.exports = User;