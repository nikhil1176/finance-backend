const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const ApiError = require('../utils/ApiError');

class AuthService {
  static async register({ email, password, firstName, lastName }) {
    const existing = User.findByEmail(email.toLowerCase().trim());
    if (existing) throw ApiError.conflict('Email already exists');

    const passwordHash = await bcrypt.hash(password, 12);

    // First user becomes admin
    const userCount = User.count();
    const role = userCount === 0 ? 'admin' : 'viewer';

    const user = User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role,
    });

    AuditLog.create({ userId: user.id, action: 'register', resourceType: 'user', resourceId: user.id, details: { role } });

    return { user, token: AuthService.generateToken(user) };
  }

  static async login({ email, password, ipAddress }) {
    const user = User.findByEmailWithPassword(email.toLowerCase().trim());
    if (!user) throw ApiError.unauthorized('Invalid email or password');
    if (user.status !== 'active') throw ApiError.forbidden('Account is inactive');

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

    AuditLog.create({ userId: user.id, action: 'login', resourceType: 'user', resourceId: user.id, ipAddress });

    const { password_hash, ...safeUser } = user;
    return { user: safeUser, token: AuthService.generateToken(user) };
  }

  static generateToken(user) {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
  }
}

module.exports = AuthService;