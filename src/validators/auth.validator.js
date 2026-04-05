function validateRegister(body) {
  const errors = [];
  if (!body.email || typeof body.email !== 'string') errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) errors.push('Invalid email format');

  if (!body.password || typeof body.password !== 'string') errors.push('Password is required');
  else if (body.password.length < 8) errors.push('Password must be at least 8 characters');

  if (!body.firstName || typeof body.firstName !== 'string' || !body.firstName.trim()) errors.push('First name is required');
  if (!body.lastName || typeof body.lastName !== 'string' || !body.lastName.trim()) errors.push('Last name is required');

  return { valid: errors.length === 0, errors };
}

function validateLogin(body) {
  const errors = [];
  if (!body.email || typeof body.email !== 'string') errors.push('Email is required');
  if (!body.password || typeof body.password !== 'string') errors.push('Password is required');
  return { valid: errors.length === 0, errors };
}

module.exports = { validateRegister, validateLogin };