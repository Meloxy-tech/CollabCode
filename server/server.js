import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import yWebsocketUtils from 'y-websocket/bin/utils';
import { getReview } from './aiReview.js';
import { registerRoom, touchRoom, listRooms } from './rooms.js';

const { setupWSConnection } = yWebsocketUtils;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/rooms', (_req, res) => {
  res.json({ rooms: listRooms() });
});

app.post('/api/review', async (req, res) => {
  const { code, language } = req.body || {};

  if (typeof code !== 'string' || code.trim().length === 0) {
    return res.status(400).json({ error: 'Request body must include a non-empty "code" string.' });
  }

  try {
    const review = await getReview(code, language || 'javascript');
    res.json(review);
  } catch (err) {
    console.error('Review generation failed:', err);
    res.status(500).json({ error: 'Failed to generate review.' });
  }
});

const server = http.createServer(app);

// Yjs uses the raw WebSocket connection for CRDT sync + awareness
// (live cursors, presence). One room = one Yjs "document name".
const wss = new WebSocketServer({ server });

wss.on('connection', (conn, req) => {
  const roomName = decodeURIComponent((req.url || '/default').slice(1).split('?')[0]) || 'default';
  registerRoom(roomName);
  touchRoom(roomName);
  setupWSConnection(conn, req, { docName: roomName });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`CollabCode server listening on http://localhost:${PORT}`);
  console.log(`WebSocket (Yjs) endpoint on ws://localhost:${PORT}/<room-name>`);
});
