import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { randomUUID, randomBytes } from 'node:crypto';
import instances from './src/ensemble.js';
import logger from './src/logger.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const sessionParser = session({
  secret: randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
});

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(sessionParser);

// Serve static assets from public (JS, CSS, images)
app.use(express.static('public'));

function requireInstance(req, res, next) {
  if (req.session?.instanceId) {
    next();
  } else {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/');
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/stage', requireInstance, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'stage.html'));
});

// Stage display (protected)
app.get('/stage-debug', requireInstance, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'stage-debug.html'));
});

app.get('/musician-debug', requireInstance, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'musician-debug.html'));
});

// Musician join page
app.get('/join/:instanceId', (req, res) => {
  const { instanceId } = req.params;
  // TODO: check if instance exists
  req.session.instanceId = instanceId;
  req.session.role = 'musician';
  res.sendFile(path.join(__dirname, 'views', 'musician.html'));
});

// API routes
app.post('/api/instance/new', (req, res) => {
  const instanceId = req.session.id;
  instances.createInstance(instanceId);
  req.session.instanceId = instanceId;
  req.session.role = 'stage';
  res.json({ instanceId });
});

app.get('/api/instance', requireInstance, (req, res) => {
  if (req.session.instanceId) {
    res.json({ instanceId: req.session.instanceId });
  } else {
    res.status(404).json({ error: 'Instance not found' });
  }
});

// WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

// socket upgrade middleware - ensure instanceId is set
server.on('upgrade', (request, socket, head) => {
  sessionParser(request, {}, () => {
    if (!request.session?.instanceId) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    };

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  });
});

wss.on('connection', (ws, req) => {
  logger.info('Client connected');
  ws.session = req.session;
  instances.handleConnection(ws);
});

server.listen(3215, () => {
  logger.info('Server is up on port 3215');
});


