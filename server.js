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
  saveUninitialized: true, // Allow session creation without data
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax' // Allow cookie on same-site redirects
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(sessionParser);

// Serve static assets from public (JS, CSS, images)
app.use(express.static(path.join(__dirname, 'views', 'stage.html')));

function requireInstance(req, res, next) {
  if (req.session?.instanceId) {
    next();
  } else {
    logger.debug(`protected route reached with no instanceid`);
    logger.debug(req.session);
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/');
  }
}


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

// Musician join page - sets instance from query param and redirects
app.get('/join', (req, res) => {
  const instanceId = req.query.instance;
  logger.debug(`join request instanceid = ${instanceId}`);

  if (!instanceId) {
    return res.redirect('/');
  }

  // TODO: check if instance exists
  req.session.instanceId = instanceId;
  req.session.role = 'musician';

  // Save session before redirecting
  req.session.save((err) => {
    if (err) {
      logger.error('Failed to save session', { error: err.message });
      return res.redirect('/');
    }
    logger.debug(`join success set session ${req.session.instanceId}`);
    res.redirect('/musician');
  });
});

// Musician page (protected)
app.get('/musician', requireInstance, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'musician.html'));
});

// Trailer page (public, no auth required)
app.get('/trailer', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'trailer.html'));
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

app.get('/', (req, res) => {
  if (req.query.instance) {
    if (!instances.instances.get(req.query.instance)) {
      req.session.regenerate(() => {
        res.redirect('/');
      });
      return;
    }
  }

  if (req.session.instanceId && req.session.instanceId !== req.session.id) {
    // musician and already logged in, redirect
    return res.redirect('/musician');
  }

  res.sendFile(path.join(__dirname, 'views', 'index.html'));
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


