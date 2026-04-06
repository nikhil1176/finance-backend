const { getDatabase, saveDatabase } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AuditLog {
  static _mapRows(result) {
    if (!result || result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  static create({ userId, action, resourceType, resourceId, details, ipAddress }) {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, userId || null, action, resourceType, resourceId || null,
        details ? JSON.stringify(details) : null, ipAddress || null, now]
    );
    saveDatabase();
    return id;
  }

  static findAll({ page = 1, limit = 50, userId, action, resourceType } = {}) {
    const db = getDatabase();
    let query = `SELECT al.*, u.email as user_email FROM audit_logs al
                 LEFT JOIN users u ON al.user_id = u.id WHERE 1=1`;
    const params = [];
    if (userId) { query += ' AND al.user_id = ?'; params.push(userId); }
    if (action) { query += ' AND al.action = ?'; params.push(action); }
    if (resourceType) { query += ' AND al.resource_type = ?'; params.push(resourceType); }

    const countQuery = query.replace(/SELECT al\.\*, u\.email as user_email FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = db.exec(countQuery, [...params]);
    const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;

    const offset = (page - 1) * limit;
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const logs = AuditLog._mapRows(db.exec(query, params));
    return {
      logs,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) },
    };
  }
}

module.exports = AuditLog;