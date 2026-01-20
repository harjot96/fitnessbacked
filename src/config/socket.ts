import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { verifyAccessToken, TokenPayload } from '../auth/jwt';

export interface SocketUser {
  userId: string;
  email: string;
}

export interface AuthenticatedSocket extends SocketIOServer {
  user?: SocketUser;
}

export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:19006',
      credentials: true,
    },
    path: '/socket.io',
  });

  // Authentication middleware for Socket.io
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const payload = verifyAccessToken(token);
      (socket as any).user = {
        userId: payload.userId,
        email: payload.email,
      };
      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  return io;
}

export default initializeSocket;
