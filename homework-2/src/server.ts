import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Ticket Management System running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

export default server;
