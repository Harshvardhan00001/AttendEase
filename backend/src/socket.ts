import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { logger } from './utils/logger.js';

let io: SocketIOServer | null = null;

export const initSocket = (server: HttpServer, frontendUrl: string): SocketIOServer => {
  io = new SocketIOServer(server, {
    cors: {
      origin: frontendUrl,
      credentials: true,
    },
  });

  io.on('connection', (socket: Socket) => {
    // logger.debug(`Socket connected: ${socket.id}`);

    socket.on('join', (data: { workplaceId: string; role: 'student' | 'teacher' }) => {
      const { workplaceId, role } = data;
      if (!workplaceId) return;

      if (role === 'teacher') {
        socket.join(`teacher:${workplaceId}`);
        // logger.debug(`Teacher socket joined room: teacher:${workplaceId}`);
      } else {
        socket.join(`workplace:${workplaceId}`);
        // logger.debug(`Student socket joined room: workplace:${workplaceId}`);
      }
    });

    socket.on('disconnect', () => {
      // logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.io not initialized. Please call initSocket(server) first.');
  }
  return io;
};

export const notifyAttendanceToggled = (workplaceId: string, isLive: boolean): void => {
  if (!io) return;
  io.to(`workplace:${workplaceId}`).emit('attendance:toggled', { workplaceId, isLive });
};

export const notifyAttendanceMarked = (
  workplaceId: string,
  data: { studentId: string; username?: string; timestamp: Date; networkVerified: boolean }
): void => {
  if (!io) return;
  io.to(`teacher:${workplaceId}`).emit('attendance:marked', data);
};
