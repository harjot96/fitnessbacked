import { Server as SocketIOServer, Socket } from 'socket.io';
import { HealthService } from '../services/health.service';
import { prisma } from '../config/database';

export function setupHealthSocketHandlers(io: SocketIOServer, socket: Socket): void {
  const healthService = new HealthService(prisma);
  const user = (socket as any).user;

  if (!user) {
    socket.disconnect();
    return;
  }

  // Join user's personal room
  socket.join(`user:${user.userId}`);

  // Health data sync request
  socket.on('health:sync', async (data: { date?: string }) => {
    try {
      if (!data.date) {
        const today = new Date().toISOString().split('T')[0];
        const healthData = await healthService.getDailyHealthData(user.userId, today);
        socket.emit('health:updated', healthData);
      } else {
        const healthData = await healthService.getDailyHealthData(user.userId, data.date);
        socket.emit('health:updated', healthData);
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to sync health data' });
    }
  });

  // Live workout location updates
  socket.on('workout:location', (data: { workoutId: string; location: any }) => {
    // Broadcast to user's room (for multi-device sync)
    socket.to(`user:${user.userId}`).emit('workout:location:update', data);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`User ${user.userId} disconnected from health socket`);
  });
}

/**
 * Emit health data update to user
 */
export function emitHealthUpdate(io: SocketIOServer, userId: string, data: any): void {
  io.to(`user:${userId}`).emit('health:updated', data);
}

/**
 * Emit workout started event
 */
export function emitWorkoutStarted(io: SocketIOServer, userId: string, workout: any): void {
  io.to(`user:${userId}`).emit('workout:started', workout);
}

/**
 * Emit workout progress update
 */
export function emitWorkoutProgress(io: SocketIOServer, userId: string, workout: any): void {
  io.to(`user:${userId}`).emit('workout:updated', workout);
}
