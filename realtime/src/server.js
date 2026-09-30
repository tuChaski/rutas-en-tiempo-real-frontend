import http from 'node:http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { env } from './config/env.js';
import { requireDriver } from './middleware/auth.js';
import { trackingLimiter } from './middleware/rateLimit.js';
import { positionHandler, stopHandler } from './handlers/gps.js';
import { registerPassengerHandlers } from './handlers/passenger.js';
import { sweepOffline } from './services/fleetState.js';

const app = express();
app.use(cors({ origin: env.corsOrigin }));
app.use(express.json({ limit: '10kb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: env.corsOrigin } });

registerPassengerHandlers(io);

app.use('/tracking', requireDriver, trackingLimiter);
app.post('/tracking/position', positionHandler(io));
app.post('/tracking/stop', stopHandler(io));

setInterval(() => {
  for (const u of sweepOffline(Date.now(), env.offlineAfterMs)) {
    io.to(`ruta:${u.rutaId}`).emit('micro:offline', { microId: u.microId, lastSeen: u.lastSeen });
  }
}, 15_000);

server.listen(env.port, () => console.log(`Realtime escuchando en :${env.port}`));
