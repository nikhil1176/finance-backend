const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');

class UserService {
  static getUsers(filters) { return User.findAll(filters); }

  static getUserById(id) {
    const user = User.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    return user;
  }

  static async createUser({ email, password, firstName, lastName, role, status }, createdBy) {
    const existing = User.findByEmail(email.toLowerCase().trim());
    if (existing) throw ApiError.conflict('Email already exists');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = User.create({
      email: email.toLowerCase().trim(), passwordHash,
      firstName: firstName.trim(), lastName: lastName.trim(),
      role: role || 'viewer', status: status || 'active',
    });

    AuditLog.create({ userId: createdBy.id, action: 'create_user', resourceType: 'user', resourceId: user.id, details: { email: user.email, role: user.role } });
    return user;
  }

  static async updateUser(id, fields, updatedBy) {
    const user = User.findById(id);
    if (!user) throw ApiError.notFound('User not found');

    if (fields.role && updatedBy.role !== 'admin') throw ApiError.forbidden('Only admins can change roles');

    if (fields.role && fields.role !== 'admin' && id === updatedBy.id) {
      if (User.count({ role: 'admin' }) <= 1) throw ApiError.badRequest('Cannot demote the last admin');
    }

    if (fields.password) {
      fields.passwordHash = await bcrypt.hash(fields.password, 12);
      delete fields.password;
    }

    const updated = User.update(id, fields);
    AuditLog.create({ userId: updatedBy.id, action: 'update_user', resourceType: 'user', resourceId: id, details: { fieldsUpdated: Object.keys(fields) } });
    return updated;
  }

  static deleteUser(id, deletedBy) {
    const user = User.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (id === deletedBy.id) throw ApiError.badRequest('Cannot delete your own account');
    if (user.role === 'admin' && User.count({ role: 'admin' }) <= 1) throw ApiError.badRequest('Cannot delete the last admin');

    User.delete(id);
    AuditLog.create({ userId: deletedBy.id, action: 'delete_user', resourceType: 'user', resourceId: id, details: { deletedEmail: user.email } });
    return true;
  }
}

module.exports = UserService;