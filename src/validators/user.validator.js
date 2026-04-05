const { ROLES, USER_STATUS } = require('../utils/constants');

function validateCreateUser(body) {
  const errors = [];
  if (!body.email || typeof body.email !== 'string') errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('Invalid email format');

  if (!body.password || typeof body.password !== 'string') errors.push('Password is required');
  else if (body.password.length < 8) errors.push('Password must be at least 8 characters');

  if (!body.firstName || typeof body.firstName !== 'string' || !body.firstName.trim()) errors.push('First name is required');
  if (!body.lastName || typeof body.lastName !== 'string' || !body.lastName.trim()) errors.push('Last name is required');

  if (body.role && !Object.values(ROLES).includes(body.role))
    errors.push(`Invalid role. Must be: ${Object.values(ROLES).join(', ')}`);
  if (body.status && !Object.values(USER_STATUS).includes(body.status))
    errors.push(`Invalid status. Must be: ${Object.values(USER_STATUS).join(', ')}`);

  return { valid: errors.length === 0, errors };
}

function validateUpdateUser(body) {
  const errors = [];
  if (body.firstName !== undefined && (!body.firstName || !body.firstName.trim())) errors.push('First name cannot be empty');
  if (body.lastName !== undefined && (!body.lastName || !body.lastName.trim())) errors.push('Last name cannot be empty');
  if (body.role !== undefined && !Object.values(ROLES).includes(body.role))
    errors.push(`Invalid role. Must be: ${Object.values(ROLES).join(', ')}`);
  if (body.status !== undefined && !Object.values(USER_STATUS).includes(body.status))
    errors.push(`Invalid status. Must be: ${Object.values(USER_STATUS).join(', ')}`);
  if (body.password !== undefined && (typeof body.password !== 'string' || body.password.length < 8))
    errors.push('Password must be at least 8 characters');

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateUser, validateUpdateUser };