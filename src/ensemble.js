import logger from './logger.js';
import { randomUUID } from 'node:crypto';

class Ensemble {
  constructor() {
    this.musicians = new Set();
    this.conductor = null;
    this.musicianIds = new WeakMap(); // Map ws to unique ID
  }

  add(ws) {
    // Assign unique ID to this connection
    const id = randomUUID();
    this.musicianIds.set(ws, id);

    // Store role on the ws object
    ws.role = null;

    ws.on('message', (msg, isBinary) => {
      try {
        if (isBinary) {
          // Binary message = sensor data from musician (37 bytes)
          this.broadcastSensorData(ws, msg);
        } else {
          // Text message = control message (identify)
          const data = JSON.parse(msg.toString());
          if (data.type === 'identify') {
            this.register(ws, data);
          }
        }
      } catch (err) {
        logger.error('Error processing message from websocket: ', err);
      }
    });

    ws.on('close', () => {
      const id = this.musicianIds.get(ws);
      logger.info('Client disconnected', { id, role: ws.role });

      if (ws.role === 'conductor') {
        logger.warn('Conductor disconnected');
        this.conductor = null;
      } else if (ws.role === 'musician') {
        this.musicians.delete(ws);
        if (this.conductor && this.conductor.readyState === 1) { // OPEN
          // Send text message for disconnect
          this.conductor.send(JSON.stringify({
            type: 'disconnect',
            musicianId: id,
          }));
        }
        logger.info('Musician removed', { remaining: this.musicians.size });
      }

      this.updateClientCount();
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
    } else {
      this.musicians.add(ws);
      logger.info('Musician registered');
    }

    this.updateClientCount();
  }

  updateClientCount() {
    if (this.conductor && this.conductor.readyState === 1) { // OPEN
      this.conductor.send(JSON.stringify({
        type: 'clientCount',
        count: this.musicians.size
      }));
    }
  }

  broadcastSensorData(ws, binaryData) {
    if (this.conductor && this.conductor.readyState === 1 && ws.role === 'musician') {
      const musicianId = this.musicianIds.get(ws);

      // Prepend musician ID (36 bytes UUID) to binary sensor data (37 bytes)
      // Total message: 73 bytes
      const idBytes = Buffer.from(musicianId, 'utf-8');
      const message = Buffer.concat([idBytes, binaryData]);

      this.conductor.send(message);
    }
  }
}

const ensemble = new Ensemble();
export default ensemble;

