import logger from './logger.js';
import { randomUUID } from 'node:crypto';

class Ensemble {
  constructor() {
    this.musicians = new Set();
    this.stage = null;
    this.tokenRotationInterval = null;
    this.pendingSessions = new Map(); // sessionId -> { token, createdAt }
    this.approvedSessions = new Set(); // Set of approved sessionIds
    this.tokenToSession = new Map(); // token -> sessionId (reverse lookup)

    // Start token rotation (every 30 seconds)
    this.startTokenRotation();
  }

  generateToken() {
    // Generate a 6-character alphanumeric token
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  startTokenRotation() {
    // Rotate tokens every 30 seconds
    this.tokenRotationInterval = setInterval(() => {
      logger.info('Rotating tokens for all pending sessions');

      // Update each pending session with a new unique token
      for (const [sessionId, session] of this.pendingSessions) {
        const oldToken = session.token;
        const newToken = this.generateToken();

        // Remove old token mapping
        this.tokenToSession.delete(oldToken);

        // Update session with new token
        session.token = newToken;

        // Add new token mapping
        this.tokenToSession.set(newToken, sessionId);

        logger.info('Token rotated for session', { sessionId, oldToken, newToken });
      }

      // Clean up old pending sessions (> 5 minutes)
      const now = Date.now();
      for (const [sessionId, session] of this.pendingSessions) {
        if (now - session.createdAt > 5 * 60 * 1000) {
          this.tokenToSession.delete(session.token);
          this.pendingSessions.delete(sessionId);
          logger.info('Removed stale pending session', { sessionId });
        }
      }
    }, 30000); // 30 seconds
  }

  stopTokenRotation() {
    if (this.tokenRotationInterval) {
      clearInterval(this.tokenRotationInterval);
      this.tokenRotationInterval = null;
    }
  }

  createPendingSession(sessionId) {
    const token = this.generateToken();

    this.pendingSessions.set(sessionId, {
      token,
      createdAt: Date.now()
    });

    // Map token to sessionId for reverse lookup
    this.tokenToSession.set(token, sessionId);

    logger.info('Created pending session', { sessionId, token });
    return token;
  }

  getPendingSession(sessionId) {
    return this.pendingSessions.get(sessionId);
  }

  getSessionByToken(token) {
    const sessionId = this.tokenToSession.get(token);
    if (!sessionId) return null;

    const session = this.pendingSessions.get(sessionId);
    if (!session) return null;

    return { sessionId, ...session };
  }

  removePendingSession(sessionId) {
    const session = this.pendingSessions.get(sessionId);
    if (session) {
      this.tokenToSession.delete(session.token);
    }
    this.pendingSessions.delete(sessionId);
  }

  approveSession(sessionId) {
    this.approvedSessions.add(sessionId);
    this.removePendingSession(sessionId);
    logger.info('Session approved', { sessionId });
  }

  isSessionApproved(sessionId) {
    return this.approvedSessions.has(sessionId);
  }

  revokeSession(sessionId) {
    this.approvedSessions.delete(sessionId);
    logger.info('Session revoked', { sessionId });
  }

  add(ws) {
    // Assign unique ID to this connection
    const id = randomUUID();
    ws.id = id;

    // Store role on the ws object
    ws.role = null;

    ws.on('message', (msg, isBinary) => {
      try {
        if (isBinary) {
          // Binary message = sensor data from musician
          this.broadcastSensorData(ws, msg);
        } else {
          // Text message = control message (identify, assign-role)
          const data = JSON.parse(msg.toString());
          if (data.type === 'identify') {
            this.register(ws, data);
          } else if (data.type === 'assign-role') {
            this.assignRole(ws, data);
          }
        }
      } catch (err) {
        logger.error('Error processing message from websocket: ', err);
      }
    })

    ws.on('close', () => {
      logger.info('Client disconnected', { id: ws.id, role: ws.role });

      if (ws.role === 'stage') {
        logger.warn('Stage disconnected');
        this.stage = null;
      } else if (ws.role === 'musician') {
        this.musicians.delete(ws);
        logger.info('Musician removed', { remaining: this.musicians.size });
      }

      this.updateClientCount(ws, 'disconnect');
    });

    ws.on('error', err => {
      logger.error('Websocket error: ', err);
    });
  }

  register(ws, data) {
    ws.role = data.role;

    if (data.role === 'stage') {
      this.stage = ws;
      logger.info('Stage registered');

      // Send initial token and musician list
      if (this.stage.readyState === 1) {
        this.stage.send(JSON.stringify({
          type: 'token-update',
          token: this.currentToken
        }));
        this.stage.send(JSON.stringify({
          type: 'musician-list',
          musicians: Array.from(this.musicians).map(m => m.id),
        }));
      }
    } else if (data.role === 'musician') {
      this.musicians.add(ws);
      logger.info('Musician registered', { id: ws.id });
      this.updateClientCount(ws);
    } else {
      logger.warn('Unknown role attempted to connect', { id: ws.id, role: data.role });
      ws.close();
    }
  }

  updateClientCount(ws, type = 'join') {
    if (this.stage && this.stage.readyState === 1) { // OPEN
      this.stage.send(JSON.stringify({
        type,
        role: ws.role,
        id: ws.id,
        count: this.musicians.size
      }));
    }
  }

  broadcastSensorData(ws, binaryData) {
    if (this.stage && this.stage.readyState === 1 && ws.role === 'musician') {
      // Prepend musician ID (UUID) to binary sensor data
      const idBytes = Buffer.from(ws.id, 'utf-8');
      const message = Buffer.concat([idBytes, binaryData]);

      this.stage.send(message);
    }
  }

  assignRole(stageWs, data) {
    // Only stage can assign roles
    if (stageWs.role !== 'stage') {
      logger.warn('Non-stage tried to assign role', { id: stageWs.id });
      return;
    }

    const { musicianId, role } = data;

    // Find the musician by ID
    const musician = Array.from(this.musicians).find(m => m.id === musicianId);

    if (!musician) {
      logger.warn('Tried to assign role to non-existent musician', { musicianId, role });
      return;
    }

    if (musician.readyState === 1) { // OPEN
      musician.send(JSON.stringify({
        type: 'role-assigned',
        role: role
      }));
      logger.info('Role assigned to musician', { musicianId, role });
    }
  }
}

const ensemble = new Ensemble();
export default ensemble;

