const ApiError = require('../utils/ApiError');
const { PERMISSIONS } = require('../utils/constants');

function authorize(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));

    const userPermissions = PERMISSIONS[req.user.role] || [];
    const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));

    if (!hasAll) {
      return next(ApiError.forbidden(
        `Role '${req.user.role}' lacks permission: ${requiredPermissions.join(', ')}`
      ));
    }
    next();
  };
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(ApiError.unauthorized('Authentication required'));
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Access restricted to roles: ${roles.join(', ')}`));
    }
    next();
  };
}

module.exports = { authorize, requireRole };