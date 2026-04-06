const { getDatabase, saveDatabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class FinancialRecord {
  static _mapRows(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  static findAll({
    page = 1, limit = 20, type, category, dateFrom, dateTo,
    minAmount, maxAmount, search, sortBy = 'date', sortOrder = 'DESC',
    includeDeleted = false,
  } = {}) {
    const db = getDatabase();
    let query = `SELECT fr.*, u.first_name || ' ' || u.last_name as created_by_name
                 FROM financial_records fr LEFT JOIN users u ON fr.user_id = u.id WHERE 1=1`;
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

    const countQuery = query.replace(
      /SELECT fr\.\*, u\.first_name \|\| ' ' \|\| u\.last_name as created_by_name\s+FROM/,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = db.exec(countQuery, [...params]);
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    const allowedSortFields = ['date', 'amount', 'type', 'category', 'created_at'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'date';
    const safeSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    query += ` ORDER BY fr.${safeSortBy} ${safeSortOrder}`;

    const offset = (page - 1) * limit;
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const records = FinancialRecord._mapRows(db.exec(query, params));
    return {
      records,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }

  static findById(id, includeDeleted = false) {
    const db = getDatabase();
    let query = `SELECT fr.*, u.first_name || ' ' || u.last_name as created_by_name
                 FROM financial_records fr LEFT JOIN users u ON fr.user_id = u.id WHERE fr.id = ?`;
    if (!includeDeleted) query += ' AND fr.is_deleted = 0';
    const rows = FinancialRecord._mapRows(db.exec(query, [id]));
    return rows[0] || null;
  }

  static create({ userId, amount, type, category, description, date }) {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO financial_records (id, user_id, amount, type, category, description, date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId, amount, type, category, description || null, date, now, now]
    );
    saveDatabase();
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
    db.run(`UPDATE financial_records SET ${updates.join(', ')} WHERE id = ? AND is_deleted = 0`, params);
    saveDatabase();
    return FinancialRecord.findById(id);
  }

  static softDelete(id) {
    const db = getDatabase();
    db.run('UPDATE financial_records SET is_deleted = 1, updated_at = ? WHERE id = ? AND is_deleted = 0',
      [new Date().toISOString(), id]);
    const changes = db.getRowsModified();
    saveDatabase();
    return changes > 0;
  }

  static hardDelete(id) {
    const db = getDatabase();
    db.run('DELETE FROM financial_records WHERE id = ?', [id]);
    const changes = db.getRowsModified();
    saveDatabase();
    return changes > 0;
  }

  static restore(id) {
    const db = getDatabase();
    db.run('UPDATE financial_records SET is_deleted = 0, updated_at = ? WHERE id = ? AND is_deleted = 1',
      [new Date().toISOString(), id]);
    const changes = db.getRowsModified();
    saveDatabase();
    return changes > 0;
  }

  static getSummary() {
    const db = getDatabase();
    const result = db.exec(
      `SELECT COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as net_balance,
        COUNT(*) as total_records
      FROM financial_records WHERE is_deleted = 0`
    );
    return FinancialRecord._mapRows(result)[0] || { total_income: 0, total_expenses: 0, net_balance: 0, total_records: 0 };
  }

  static getCategoryTotals(type = null) {
    const db = getDatabase();
    let query = `SELECT category, type, SUM(amount) as total_amount, COUNT(*) as record_count, AVG(amount) as avg_amount
                 FROM financial_records WHERE is_deleted = 0`;
    const params = [];
    if (type) { query += ' AND type = ?'; params.push(type); }
    query += ' GROUP BY category, type ORDER BY total_amount DESC';
    return FinancialRecord._mapRows(db.exec(query, params));
  }

  static getMonthlyTrends(months = 12) {
    const db = getDatabase();
    return FinancialRecord._mapRows(db.exec(
      `SELECT strftime('%Y-%m', date) as month, type, SUM(amount) as total_amount, COUNT(*) as record_count
       FROM financial_records WHERE is_deleted = 0 AND date >= date('now', '-' || ? || ' months')
       GROUP BY month, type ORDER BY month ASC`, [months]
    ));
  }

  static getWeeklyTrends(weeks = 12) {
    const db = getDatabase();
    return FinancialRecord._mapRows(db.exec(
      `SELECT strftime('%Y-W%W', date) as week, type, SUM(amount) as total_amount, COUNT(*) as record_count
       FROM financial_records WHERE is_deleted = 0 AND date >= date('now', '-' || ? || ' days')
       GROUP BY week, type ORDER BY week ASC`, [weeks * 7]
    ));
  }

  static getRecentActivity(limit = 10) {
    const db = getDatabase();
    return FinancialRecord._mapRows(db.exec(
      `SELECT fr.*, u.first_name || ' ' || u.last_name as created_by_name
       FROM financial_records fr LEFT JOIN users u ON fr.user_id = u.id
       WHERE fr.is_deleted = 0 ORDER BY fr.created_at DESC LIMIT ?`, [limit]
    ));
  }

  static getDailyTotals(days = 30) {
    const db = getDatabase();
    return FinancialRecord._mapRows(db.exec(
      `SELECT date,
        SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as income,
        SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
        SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net
       FROM financial_records WHERE is_deleted = 0 AND date >= date('now', '-' || ? || ' days')
       GROUP BY date ORDER BY date ASC`, [days]
    ));
  }

  static getTopCategories(type, limit = 5) {
    const db = getDatabase();
    return FinancialRecord._mapRows(db.exec(
      `SELECT category, SUM(amount) as total_amount, COUNT(*) as count
       FROM financial_records WHERE is_deleted = 0 AND type = ?
       GROUP BY category ORDER BY total_amount DESC LIMIT ?`, [type, limit]
    ));
  }
}

module.exports = FinancialRecord;