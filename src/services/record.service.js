const FinancialRecord = require('../models/FinancialRecord');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');

class RecordService {
  static getRecords(filters) { return FinancialRecord.findAll(filters); }

  static getRecordById(id) {
    const record = FinancialRecord.findById(id);
    if (!record) throw ApiError.notFound('Financial record not found');
    return record;
  }

  static createRecord(data, createdBy) {
    const record = FinancialRecord.create({
      userId: createdBy.id, amount: data.amount, type: data.type,
      category: data.category.toLowerCase(), description: data.description, date: data.date,
    });
    AuditLog.create({ userId: createdBy.id, action: 'create_record', resourceType: 'financial_record', resourceId: record.id, details: { amount: data.amount, type: data.type, category: data.category } });
    return record;
  }

  static updateRecord(id, fields, updatedBy) {
    const record = FinancialRecord.findById(id);
    if (!record) throw ApiError.notFound('Financial record not found');
    if (fields.category) fields.category = fields.category.toLowerCase();

    const updated = FinancialRecord.update(id, fields);
    AuditLog.create({ userId: updatedBy.id, action: 'update_record', resourceType: 'financial_record', resourceId: id, details: { fieldsUpdated: Object.keys(fields) } });
    return updated;
  }

  static deleteRecord(id, deletedBy, hard = false) {
    const record = FinancialRecord.findById(id, true);
    if (!record) throw ApiError.notFound('Financial record not found');

    if (hard) {
      FinancialRecord.hardDelete(id);
    } else {
      if (record.is_deleted) throw ApiError.badRequest('Record is already deleted');
      FinancialRecord.softDelete(id);
    }

    AuditLog.create({ userId: deletedBy.id, action: hard ? 'hard_delete_record' : 'soft_delete_record', resourceType: 'financial_record', resourceId: id });
    return true;
  }

  static restoreRecord(id, restoredBy) {
    const record = FinancialRecord.findById(id, true);
    if (!record) throw ApiError.notFound('Financial record not found');
    if (!record.is_deleted) throw ApiError.badRequest('Record is not deleted');

    FinancialRecord.restore(id);
    AuditLog.create({ userId: restoredBy.id, action: 'restore_record', resourceType: 'financial_record', resourceId: id });
    return true;
  }
}

module.exports = RecordService;