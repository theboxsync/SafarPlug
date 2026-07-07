import http from 'http';
import app from './app';
import { env } from './config/env';
import { connectDatabase } from './config/db';
import { initializeSocket } from './services/socketService';

const server = http.createServer(app);

// Attach Socket.io server
initializeSocket(server);

const startServer = async () => {
  try {
    // 1. Establish Mongoose connection to MongoDB
    await connectDatabase();

    // 2. Start HTTP & Socket listener
    server.listen(env.PORT, () => {
      console.log(`=================================`);
      console.log(`🚀 SafarPlug Server running on port: ${env.PORT}`);
      console.log(`🔌 WebSockets active & listening`);
      console.log(`=================================`);
    });
  } catch (error) {
    console.error('Fatal: Failed to bootstrap server:', error);
    process.exit(1);
  }
};

startServer();
