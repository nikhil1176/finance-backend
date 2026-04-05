const express = require('express');
const router = express.Router();
const UserService = require('../services/user.service');
const AuditLog = require('../models/AuditLog');
const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const { validate } = require('../middleware/validate');
const { validateCreateUser, validateUpdateUser } = require('../validators/user.validator');
const ApiResponse = require('../utils/ApiResponse');

router.use(authenticate);

router.get('/', authorize('user:read'), (req, res, next) => {
  try {
    const result = UserService.getUsers(req.query);
    ApiResponse.paginated(res, result.users, result.pagination, 'Users retrieved');
  } catch (error) { next(error); }
});

router.get('/:id', authorize('user:read'), (req, res, next) => {
  try {
    const user = UserService.getUserById(req.params.id);
    ApiResponse.success(res, { user }, 'User retrieved');
  } catch (error) { next(error); }
});

router.post('/', authorize('user:create'), validate(validateCreateUser), async (req, res, next) => {
  try {
    const user = await UserService.createUser(req.body, req.user);
    ApiResponse.created(res, { user }, 'User created');
  } catch (error) { next(error); }
});

router.put('/:id', authorize('user:update'), validate(validateUpdateUser), async (req, res, next) => {
  try {
    const user = await UserService.updateUser(req.params.id, req.body, req.user);
    ApiResponse.success(res, { user }, 'User updated');
  } catch (error) { next(error); }
});

router.delete('/:id', authorize('user:delete'), (req, res, next) => {
  try {
    UserService.deleteUser(req.params.id, req.user);
    ApiResponse.success(res, null, 'User deleted');
  } catch (error) { next(error); }
});

router.get('/:id/audit-logs', authorize('user:read'), (req, res, next) => {
  try {
    UserService.getUserById(req.params.id);
    const result = AuditLog.findAll({ ...req.query, userId: req.params.id });
    ApiResponse.paginated(res, result.logs, result.pagination, 'Audit logs retrieved');
  } catch (error) { next(error); }
});

module.exports = router;