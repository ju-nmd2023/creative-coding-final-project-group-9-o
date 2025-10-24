import logger from './logger.js';
import { randomUUID } from 'node:crypto';

class Ensemble {
  constructor() {
    this.musicians = new Set();
    this.conductor = null;
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

      if (ws.role === 'conductor') {
        logger.warn('Conductor disconnected');
        this.conductor = null;
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
    if (data.role === 'conductor') {
      this.conductor = ws;
      logger.info('Conductor registered');
      if (this.conductor.readyState === 1) {
        this.conductor.send(JSON.stringify({
          type: 'musician-list',
          musicians: Array.from(this.musicians).map(m => m.id),
        }));
      }
    } else {
      this.musicians.add(ws);
      logger.info('Musician registered');
    }

    this.updateClientCount(ws);
  }

  updateClientCount(ws, type = 'join') {
    if (this.conductor && this.conductor.readyState === 1) { // OPEN
      this.conductor.send(JSON.stringify({
        type,
        role: ws.role,
        id: ws.id,
        count: this.musicians.size
      }));
    }
  }

  broadcastSensorData(ws, binaryData) {
    if (this.conductor && this.conductor.readyState === 1 && ws.role === 'musician') {
      // Prepend musician ID (UUID) to binary sensor data
      const idBytes = Buffer.from(ws.id, 'utf-8');
      const message = Buffer.concat([idBytes, binaryData]);

      this.conductor.send(message);
    }
  }

  assignRole(conductorWs, data) {
    // Only conductor can assign roles
    if (conductorWs.role !== 'conductor') {
      logger.warn('Non-conductor tried to assign role', { id: conductorWs.id });
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

