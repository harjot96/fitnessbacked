import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { authMiddleware } from './auth/middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { initializeSocket } from './config/socket';
import { setupSocketHandlers } from './sockets/socket.handlers';
import { prisma } from './config/database';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import healthRoutes from './routes/health.routes';
import communityRoutes from './routes/community.routes';
import foodRoutes from './routes/food.routes';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 4000;

async function startServer() {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS configuration
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:19006',
      credentials: true,
    })
  );

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Auth middleware (extracts JWT token - doesn't require auth for all routes)
  app.use(authMiddleware);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/health', healthRoutes);
  app.use('/api/community', communityRoutes);
  app.use('/api/food', foodRoutes);

  // 404 handler
  app.use(notFoundHandler);

  // Error handling middleware (must be last)
  app.use(errorHandler);

  // Create HTTP server from Express app
  const httpServer = createServer(app);

  // Initialize Socket.io
  const io = initializeSocket(httpServer);
  setupSocketHandlers(io);

  // Make io available to app (for emitting events from controllers)
  (app as any).io = io;

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    httpServer.close(() => {
      prisma.$disconnect();
      process.exit(0);
    });
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down gracefully...');
    httpServer.close(() => {
      prisma.$disconnect();
      process.exit(0);
    });
  });

  // Start server
  httpServer.listen(PORT, () => {
    console.log(`🚀 REST API server ready at http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔐 Auth endpoints: http://localhost:${PORT}/api/auth`);
    console.log(`👤 User endpoints: http://localhost:${PORT}/api/users`);
    console.log(`🏥 Health endpoints: http://localhost:${PORT}/api/health`);
    console.log(`👥 Community endpoints: http://localhost:${PORT}/api/community`);
    console.log(`🍎 Food endpoints: http://localhost:${PORT}/api/food`);
    console.log(`⚡ Socket.io ready at http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
