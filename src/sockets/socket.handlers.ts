import { Server as SocketIOServer, Socket } from 'socket.io';
import { setupHealthSocketHandlers } from './health.socket';
import { setupCommunitySocketHandlers } from './community.socket';

export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket: Socket) => {
    const user = (socket as any).user;
    
    if (!user) {
      socket.disconnect();
      return;
    }

    console.log(`User ${user.userId} connected via Socket.io`);

    // Setup handlers for different namespaces
    setupHealthSocketHandlers(io, socket);
    setupCommunitySocketHandlers(io, socket);
  });
}

export default setupSocketHandlers;
