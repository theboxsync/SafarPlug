import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { config } from '../core/constants/config';

interface SocketStoreState {
  socket: Socket | null;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  joinSessionRoom: (sessionId: string) => void;
  leaveSessionRoom: (sessionId: string) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
}

export const useSocketStore = create<SocketStoreState>((set, get) => ({
  socket: null,
  isConnected: false,

  connect: () => {
    const { socket } = get();
    if (socket?.connected) return; // already connected

    const socketUrl = config.SOCKET_URL;
    if (!socketUrl) {
      console.warn('[SocketStore] SOCKET_URL is not defined');
      return;
    }

    const newSocket = io(socketUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    newSocket.on('connect', () => {
      console.log('[SocketStore] Connected:', newSocket.id);
      set({ isConnected: true });
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[SocketStore] Disconnected:', reason);
      set({ isConnected: false });
    });

    newSocket.on('connect_error', (err) => {
      console.warn('[SocketStore] Connection error:', err.message);
    });

    set({ socket: newSocket });
  },

  disconnect: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null, isConnected: false });
    }
  },

  joinSessionRoom: (sessionId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('session:join', { sessionId });
      console.log(`[SocketStore] Joined room session:${sessionId}`);
    }
  },

  leaveSessionRoom: (sessionId: string) => {
    const { socket } = get();
    if (socket?.connected) {
      socket.emit('session:leave', { sessionId });
      console.log(`[SocketStore] Left room session:${sessionId}`);
    }
  },

  on: (event, handler) => {
    const { socket } = get();
    socket?.on(event, handler);
  },

  off: (event, handler) => {
    const { socket } = get();
    if (handler) {
      socket?.off(event, handler);
    } else {
      socket?.off(event);
    }
  },
}));
