const ApiError = require('../utils/ApiError');

function errorHandler(err, req, res, next) {
  if (process.env.NODE_ENV === 'development') console.error('Error:', err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false, message: err.message, details: err.details || null,
      timestamp: new Date().toISOString(),
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false, message: 'Invalid JSON in request body',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(500).json({
    success: false, message: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
}

module.exports = { errorHandler };