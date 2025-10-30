import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { webhookRouter } from './webhook';
import { apiRouter, initializeWebSocket as initializeSocketIO } from './api';
import { initializeWebSocket } from './websocketManager';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize WebSockets (ws + socket.io)
initializeWebSocket(server);
initializeSocketIO(server);

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001', 'http://localhost:3002', 'http://127.0.0.1:3002', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
// Mount webhook router BEFORE json parser to preserve raw body for signature verification
app.use('/webhook', webhookRouter);
// JSON parser for the rest of the API
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server initialized`);
  console.log(`📡 API endpoints: http://localhost:${PORT}/api`);
});

export default app;