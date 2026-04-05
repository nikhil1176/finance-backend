const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User');

function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access token required. Use: Bearer <token>');
    }

    const token = authHeader.split(' ')[1];
    if (!token) throw ApiError.unauthorized('Token missing');

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = User.findById(decoded.userId);

    if (!user) throw ApiError.unauthorized('User not found');
    if (user.status !== 'active') throw ApiError.forbidden('Account is inactive');

    req.user = user;
    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    if (error.name === 'JsonWebTokenError') return next(ApiError.unauthorized('Invalid token'));
    if (error.name === 'TokenExpiredError') return next(ApiError.unauthorized('Token expired'));
    next(ApiError.unauthorized('Authentication failed'));
  }
}

module.exports = { authenticate };