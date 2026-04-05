const ApiError = require('../utils/ApiError');

function validate(validatorFn) {
  return (req, res, next) => {
    const { valid, errors } = validatorFn(req.body, req.params, req.query);
    if (!valid) return next(ApiError.badRequest('Validation failed', errors));
    next();
  };
}

module.exports = { validate };