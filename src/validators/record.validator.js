const { RECORD_TYPES, CATEGORIES } = require('../utils/constants');

function validateCreateRecord(body) {
  const errors = [];
  if (body.amount === undefined || body.amount === null) errors.push('Amount is required');
  else if (typeof body.amount !== 'number' || body.amount <= 0) errors.push('Amount must be a positive number');

  if (!body.type) errors.push('Type is required');
  else if (!Object.values(RECORD_TYPES).includes(body.type))
    errors.push(`Type must be: ${Object.values(RECORD_TYPES).join(', ')}`);

  if (!body.category || typeof body.category !== 'string') errors.push('Category is required');
  else if (!CATEGORIES.includes(body.category.toLowerCase()))
    errors.push(`Category must be one of: ${CATEGORIES.join(', ')}`);

  if (!body.date) errors.push('Date is required');
  else if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) errors.push('Date must be YYYY-MM-DD format');
  else if (isNaN(new Date(body.date).getTime())) errors.push('Invalid date');

  if (body.description !== undefined && typeof body.description !== 'string') errors.push('Description must be a string');

  return { valid: errors.length === 0, errors };
}

function validateUpdateRecord(body) {
  const errors = [];
  if (body.amount !== undefined && (typeof body.amount !== 'number' || body.amount <= 0))
    errors.push('Amount must be a positive number');
  if (body.type !== undefined && !Object.values(RECORD_TYPES).includes(body.type))
    errors.push(`Type must be: ${Object.values(RECORD_TYPES).join(', ')}`);
  if (body.category !== undefined && !CATEGORIES.includes(body.category.toLowerCase()))
    errors.push(`Category must be one of: ${CATEGORIES.join(', ')}`);
  if (body.date !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(body.date)) errors.push('Date must be YYYY-MM-DD format');
    else if (isNaN(new Date(body.date).getTime())) errors.push('Invalid date');
  }
  if (body.description !== undefined && typeof body.description !== 'string') errors.push('Description must be a string');

  const hasUpdate = ['amount', 'type', 'category', 'date', 'description'].some(f => body[f] !== undefined);
  if (!hasUpdate) errors.push('At least one field must be provided for update');

  return { valid: errors.length === 0, errors };
}

module.exports = { validateCreateRecord, validateUpdateRecord };