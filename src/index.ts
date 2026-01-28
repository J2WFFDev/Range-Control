import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import bookingsRouter from './routes/bookings.js';
import resourcesRouter from './routes/resources.js';
import auditRouter from './routes/audit.js';
import calendarRouter from './routes/calendar.js';
import pool from './db/connection.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check database connection
    await pool.query('SELECT 1');
    res.json({ 
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// API info endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Range Booking Automation API',
    version: '1.0.0',
    description: 'Centralized system for managing range resource bookings',
    endpoints: {
      bookings: '/api/bookings',
      resources: '/api/resources',
      audit: '/api/audit',
      calendar: '/api/calendar',
      health: '/health'
    },
    documentation: 'See README.md for API documentation'
  });
});

// API Routes
app.use('/api/bookings', bookingsRouter);
app.use('/api/resources', resourcesRouter);
app.use('/api/audit', auditRouter);
app.use('/api/calendar', calendarRouter);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║   Range Booking Automation System                    ║
║   Server running on port ${PORT}                         ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║   Timezone: ${process.env.TIMEZONE || 'America/New_York'}                  ║
╚═══════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await pool.end();
  process.exit(0);
});

export default app;
