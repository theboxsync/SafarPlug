import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { env } from '../config/env';

let io: Server | null = null;

export const initializeSocket = (server: HttpServer): Server => {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a specific session room
    socket.on('session:join', (data: { sessionId: string }) => {
      if (data?.sessionId) {
        socket.join(`session:${data.sessionId}`);
        console.log(`Socket ${socket.id} joined room session:${data.sessionId}`);
      }
    });

    // Leave a specific session room
    socket.on('session:leave', (data: { sessionId: string }) => {
      if (data?.sessionId) {
        socket.leave(`session:${data.sessionId}`);
        console.log(`Socket ${socket.id} left room session:${data.sessionId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const emitToSessionRoom = (sessionId: string, event: string, data: any): void => {
  if (!io) return;
  io.to(`session:${sessionId}`).emit(event, data);
};
