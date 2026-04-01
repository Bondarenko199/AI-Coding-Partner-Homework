import express from 'express';
import ticketRoutes from './routes/ticket-routes.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/tickets', ticketRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
