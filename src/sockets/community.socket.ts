import { Server as SocketIOServer, Socket } from 'socket.io';
import { CommunityService } from '../services/community.service';
import { prisma } from '../config/database';

export function setupCommunitySocketHandlers(io: SocketIOServer, socket: Socket): void {
  const communityService = new CommunityService(prisma);
  const user = (socket as any).user;

  if (!user) {
    socket.disconnect();
    return;
  }

  // Join user's personal room
  socket.join(`user:${user.userId}`);

  // Disconnect handler
  socket.on('disconnect', () => {
    console.log(`User ${user.userId} disconnected from community socket`);
  });
}

/**
 * Emit friend request notification
 */
export function emitFriendRequest(io: SocketIOServer, toUserId: string, request: any): void {
  io.to(`user:${toUserId}`).emit('friend:request', request);
}

/**
 * Emit friend accepted notification
 */
export function emitFriendAccepted(io: SocketIOServer, userId: string, friend: any): void {
  io.to(`user:${userId}`).emit('friend:accepted', friend);
}

/**
 * Emit clan invite notification
 */
export function emitClanInvite(io: SocketIOServer, toUserId: string, invite: any): void {
  io.to(`user:${toUserId}`).emit('clan:invite', invite);
}

/**
 * Emit new notification
 */
export function emitNotification(io: SocketIOServer, userId: string, notification: any): void {
  io.to(`user:${userId}`).emit('notification:new', notification);
}

/**
 * Emit ring stats update
 */
export function emitRingStatsUpdate(io: SocketIOServer, userId: string, stats: any): void {
  io.to(`user:${userId}`).emit('ring:stats:updated', stats);
}
