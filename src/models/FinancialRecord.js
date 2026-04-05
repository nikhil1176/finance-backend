const { getDatabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class FinancialRecord {
  static findAll({
    page = 1, limit = 20, type, category, dateFrom, dateTo,
    minAmount, maxAmount, search, sortBy = 'date', sortOrder = 'DESC',
    includeDeleted = false,
  } = {}) {
    const db = getDatabase();
    let query = `SELECT fr.*, u.first_name || ' ' || u.last_name as created_by_name
                 FROM financial_records fr
                 LEFT JOIN users u ON fr.user_id = u.id
                 WHERE 1=1`;
    const params = [];

    if (!includeDeleted) { query += ' AND fr.is_deleted = 0'; }
    if (type) { query += ' AND fr.type = ?'; params.push(type); }
    if (category) { query += ' AND fr.category = ?'; params.push(category); }
    if (dateFrom) { query += ' AND fr.date >= ?'; params.push(dateFrom); }
    if (dateTo) { query += ' AND fr.date <= ?'; params.push(dateTo); }
    if (minAmount !== undefined) { query += ' AND fr.amount >= ?'; params.push(parseFloat(minAmount)); }
    if (maxAmount !== undefined) { query += ' AND fr.amount <= ?'; params.push(parseFloat(maxAmount)); }
    if (search) {
      query += ' AND (fr.description LIKE ? OR fr.category LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s);
    }

    // Count
    const countParams = [...params];
    const countQuery = `SELECT COUNT(*) as total FROM financial_records fr WHERE 1=1` +
      (!includeDeleted ? ' AND fr.is_deleted = 0' : '') +
      (type ? ' AND fr.type = ?' : '') +
      (category ? ' AND fr.category = ?' : '') +
      (dateFrom ? ' AND fr.date >= ?' : '') +
      (dateTo ? ' AND fr.date <= ?' : '') +
      (minAmount !== undefined ? ' AND fr.amount >= ?' : '') +
      (maxAmount !== undefined ? ' AND fr.amount <= ?' : '') +
      (search ? ' AND (fr.description LIKE ? OR fr.category LIKE ?)' : '');

    const { total } = db.prepare(countQuery).get(...countParams);

    const allowedSortFields = ['date', 'amount', 'type', 'category', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY fr.${safeSortBy} ${safeSortOrder}`;

    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const records = db.prepare(query).all(...params);

    return {
      records,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  static findById(id, includeDeleted = false) {
    const db = getDatabase();
    let query = `SELECT fr.*, u.first_name || ' ' || u.last_name as created_by_name
                 FROM financial_records fr
                 LEFT JOIN users u ON fr.user_id = u.id
                 WHERE fr.id = ?`;
    if (!includeDeleted) query += ' AND fr.is_deleted = 0';
    return db.prepare(query).get(id);
  }

  static create({ userId, amount, type, category, description, date }) {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO financial_records (id, user_id, amount, type, category, description, date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, userId, amount, type, category, description || null, date, now, now);
    return FinancialRecord.findById(id);
  }

  static update(id, fields) {
    const db = getDatabase();
    const allowedFields = ['amount', 'type', 'category', 'description', 'date'];
    const updates = [];
    const params = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    }

    if (updates.length === 0) return FinancialRecord.findById(id);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(id);

    db.prepare(`UPDATE financial_records SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`).run(...params);
    return FinancialRecord.findById(id);
  }

  static softDelete(id) {
    const db = getDatabase();
    const now = new Date().toISOString();
    const result = db.prepare('UPDATE financial_records SET is_deleted = 1, updated_at = ? WHERE id = ? AND is_deleted = 0').run(now, id);
    return result.changes > 0;
  }

  static hardDelete(id) {
    const db = getDatabase();
    return db.prepare('DELETE FROM financial_records WHERE id = ?').run(id).changes > 0;
  }

  static restore(id) {
    const db = getDatabase();
    const now = new Date().toISOString();
    return db.prepare('UPDATE financial_records SET is_deleted = 0, updated_at = ? WHERE id = ? AND is_deleted = 1').run(now, id).changes > 0;
  }

  static getSummary() {
    const db = getDatabase();
    return db.prepare(
      `SELECT
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance,
        COUNT(*) as total_records
      FROM financial_records WHERE is_deleted = 0`
    ).get();
  }

  static getCategoryTotals(type = null) {
    const db = getDatabase();
    let query = `SELECT category, type, SUM(amount) as total_amount, COUNT(*) as record_count, AVG(amount) as avg_amount
                 FROM financial_records WHERE is_deleted = 0`;
    const params = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' GROUP BY category, type ORDER BY total_amount DESC';
    return db.prepare(query).all(...params);
  }

  static getMonthlyTrends(months = 12) {
    const db = getDatabase();
    return db.prepare(
      `SELECT strftime('%Y-%m', date) as month, type,
        SUM(amount) as total_amount, COUNT(*) as record_count
      FROM financial_records
      WHERE is_deleted = 0 AND date >= date('now', '-' || ? || ' months')
      GROUP BY month, type ORDER BY month ASC`
    ).all(months);
  }

  static getWeeklyTrends(weeks = 12) {
    const db = getDatabase();
    return db.prepare(
      `SELECT strftime('%Y-W%W', date) as week, type,
        SUM(amount) as total_amount, COUNT(*) as record_count
      FROM financial_records
      WHERE is_deleted = 0 AND date >= date('now', '-' || ? || ' days')
      GROUP BY week, type ORDER BY week ASC`
    ).all(weeks * 7);
  }

  static getRecentActivity(limit = 10) {
    const db = getDatabase();
    return db.prepare(
      `SELECT fr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM financial_records fr LEFT JOIN users u ON fr.user_id = u.id
       WHERE fr.is_deleted = 0 ORDER BY fr.created_at DESC LIMIT ?`
    ).all(limit);
  }

  static getDailyTotals(days = 30) {
    const db = getDatabase();
    return db.prepare(
      `SELECT date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
      FROM financial_records
      WHERE is_deleted = 0 AND date >= date('now', '-' || ? || ' days')
      GROUP BY date ORDER BY date ASC`
    ).all(days);
  }

  static getTopCategories(type, limit = 5) {
    const db = getDatabase();
    return db.prepare(
      `SELECT category, SUM(amount) as total_amount, COUNT(*) as count
       FROM financial_records WHERE is_deleted = 0 AND type = ?
       GROUP BY category ORDER BY total_amount DESC LIMIT ?`
    ).all(type, limit);
  }
}

module.exports = FinancialRecord;