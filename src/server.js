require('dotenv').config();
const app = require('./app');
const { getDatabase, closeDatabase } = require('./config/database');

const PORT = process.env.PORT || 3000;

// Initialize database
try {
  getDatabase();
  console.log('✅ Database initialized successfully');
} catch (error) {
  console.error('❌ Database initialization failed:', error.message);
  process.exit(1);
}

// Start server
const server = app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   Finance Backend API Server                      ║
  ║   Running on: http://localhost:${PORT}              ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                  ║
  ║   API Docs: http://localhost:${PORT}/api            ║
  ╚═══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
function gracefulShutdown(signal) {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed');
    closeDatabase();
    console.log('Database connection closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = server;