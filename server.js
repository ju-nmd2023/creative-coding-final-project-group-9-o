import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { randomUUID, randomBytes } from 'node:crypto';
import ensemble from './src/ensemble.js';
import logger from './src/logger.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Password for staff authentication (can be moved to env variable)
const STAFF_PASSWORD = process.env.STAFF_PASSWORD || 'exhibition2025';

// Generate persistent auto-authorization key (in production, store this in env or DB)
const AUTO_AUTH_KEY = process.env.AUTO_AUTH_KEY || randomBytes(32).toString('hex');

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'strict'
  }
}));

// Serve static assets from public (JS, CSS, images)
app.use(express.static('public'));

// Middleware to check if user is staff
function requireStaff(req, res, next) {
  if (req.session && req.session.isStaff) {
    next();
  } else {
    // Check if this is an API request or page request
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/staff/login');
  }
}

// Middleware to check if musician session is approved
function requireApprovedMusician(req, res, next) {
  const sessionId = req.session?.musicianId;
  if (sessionId && ensemble.isSessionApproved(sessionId)) {
    next();
  } else {
    // Check if this is an API request or page request
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    res.redirect('/musician');
  }
}

// API Routes

// Staff login
app.post('/api/staff/login', (req, res) => {
  const { password } = req.body;

  if (password === STAFF_PASSWORD) {
    req.session.isStaff = true;
    logger.info('Staff logged in');
    res.json({ success: true });
  } else {
    logger.warn('Failed staff login attempt');
    res.status(401).json({ error: 'Invalid password' });
  }
});

// Staff logout
app.post('/api/staff/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      logger.error('Error destroying session', err);
      res.status(500).json({ error: 'Logout failed' });
    } else {
      res.json({ success: true });
    }
  });
});

// Get musician session info and current token
app.get('/api/musician/token', (req, res) => {
  const sessionId = req.session?.musicianId;

  if (!sessionId) {
    return res.status(401).json({ error: 'No session found' });
  }

  const pendingSession = ensemble.getPendingSession(sessionId);

  if (!pendingSession) {
    // Session might be approved already
    if (ensemble.isSessionApproved(sessionId)) {
      return res.json({
        sessionId,
        token: null,
        approved: true
      });
    }
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    sessionId,
    token: pendingSession.token,
    approved: false
  });
});

// Approve musician session (staff only) - token only
app.post('/api/staff/approve-musician', requireStaff, (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Look up session by token
  const sessionData = ensemble.getSessionByToken(token);
  if (!sessionData) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  // Mark session as approved
  ensemble.approveSession(sessionData.sessionId);
  logger.info('Musician session approved', { sessionId: sessionData.sessionId, token });

  res.json({
    success: true,
    sessionId: sessionData.sessionId
  });
});

// Page Routes

// Landing page (public)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Staff login page
app.get('/staff/login', (req, res) => {
  // If already logged in, redirect to staff portal
  if (req.session && req.session.isStaff) {
    return res.redirect('/staff');
  }
  res.sendFile(path.join(__dirname, 'views', 'staff-login.html'));
});

// Staff portal (protected)
app.get('/staff', requireStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'staff.html'));
});

// Staff scanner page (protected)
app.get('/staff/scanner', requireStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'staff-scanner.html'));
});

// Staff QR authorization page (protected) - generates QR code with auto-auth link
app.get('/staff/qr-auth', requireStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'staff-qr-auth.html'));
});

// Get auto-auth key (staff only)
app.get('/api/staff/auth-key', requireStaff, (req, res) => {
  const host = req.get('host');
  const protocol = req.protocol;
  const url = `${protocol}://${host}/musician/auto-auth?key=${AUTO_AUTH_KEY}`;

  res.json({
    key: AUTO_AUTH_KEY,
    url
  });
});

// Stage display (protected)
app.get('/stage', requireStaff, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'stage.html'));
});

// Musician auth page - creates session
app.get('/musician', (req, res) => {
  // Create or get existing musician session
  if (!req.session.musicianId) {
    req.session.musicianId = randomUUID();
    const token = ensemble.createPendingSession(req.session.musicianId);
    req.session.currentToken = token;
    logger.info('Created musician session', {
      musicianId: req.session.musicianId,
      token
    });
  }

  res.sendFile(path.join(__dirname, 'views', 'musician-auth.html'));
});

// Musician auto-authorization page - validates key and auto-approves
app.get('/musician/auto-auth', (req, res) => {
  const { key } = req.query;

  // Validate auth key
  if (key !== AUTO_AUTH_KEY) {
    return res.status(403).send('Invalid authorization key');
  }

  // Create or get existing musician session
  if (!req.session.musicianId) {
    req.session.musicianId = randomUUID();
    logger.info('Created auto-auth musician session', {
      musicianId: req.session.musicianId
    });
  }

  // Auto-approve the session
  ensemble.approveSession(req.session.musicianId);
  logger.info('Auto-approved musician session', {
    musicianId: req.session.musicianId
  });

  res.sendFile(path.join(__dirname, 'views', 'musician-auto-auth.html'));
});

// Musician interface (requires approved session)
app.get('/musician/interface', requireApprovedMusician, (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'musician.html'));
});

// WebSocket server
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  logger.info('Client connected');
  ensemble.add(ws);
});

server.listen(3215, () => {
  logger.info('Server is up on port 3215');
  logger.info('Auto-authorization key:', AUTO_AUTH_KEY);
  if (!process.env.AUTO_AUTH_KEY) {
    logger.warn('Using generated AUTO_AUTH_KEY. Set AUTO_AUTH_KEY environment variable for persistence.');
  }
});


