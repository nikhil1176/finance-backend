const express = require('express');
const router = express.Router();
const AuthService = require('../services/auth.service');
const UserService = require('../services/user.service');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { validateRegister, validateLogin } = require('../validators/auth.validator');
const { authLimiter } = require('../middleware/rateLimiter');
const ApiResponse = require('../utils/ApiResponse');

router.post('/register', authLimiter, validate(validateRegister), async (req, res, next) => {
  try {
    const result = await AuthService.register(req.body);
    ApiResponse.created(res, { user: result.user, token: result.token }, 'Registration successful');
  } catch (error) { next(error); }
});

router.post('/login', authLimiter, validate(validateLogin), async (req, res, next) => {
  try {
    const result = await AuthService.login({ ...req.body, ipAddress: req.ip });
    ApiResponse.success(res, { user: result.user, token: result.token }, 'Login successful');
  } catch (error) { next(error); }
});

router.get('/me', authenticate, (req, res) => {
  ApiResponse.success(res, { user: req.user }, 'Profile retrieved');
});

router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { firstName, lastName, password } = req.body;
    const fields = {};
    if (firstName) fields.firstName = firstName;
    if (lastName) fields.lastName = lastName;
    if (password) fields.password = password;

    if (Object.keys(fields).length === 0) return ApiResponse.success(res, { user: req.user }, 'No changes');

    const updated = await UserService.updateUser(req.user.id, fields, req.user);
    ApiResponse.success(res, { user: updated }, 'Profile updated');
  } catch (error) { next(error); }
});

module.exports = router;