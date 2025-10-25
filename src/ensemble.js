/**
  * @import WebSocket from 'ws';
  */

import logger from './logger.js';
import { randomUUID, randomInt } from 'node:crypto';

class InstanceManager {
  constructor() {
    this.instances = new Map();
  }

  createInstance(instanceId) {
    logger.info('creating new instance', { instanceId });
    const instance = {
      id: instanceId,
      stage: null,
      musicians: new Map(),
    };
    this.instances.set(instanceId, instance);
    return instance;
  }

  /**
    * @param {WebSocket} ws
    */
  handleConnection(ws) {
    const { instanceId, role, id: sessionId } = ws.session;

    const instance = this.instances.get(instanceId);
    if (!instance) {
      logger.error('Instance not found for connection', { instanceId });
      ws.close();
      return;
    }

    ws.on('message', (msg, isBinary) => this.handleMessage(ws, instance, msg, isBinary));
    ws.on('close', () => this.handleDisconnect(ws, instance));
    ws.on('error', (err) => logger.error('Websocket error', { error: err.message }));

    if (role === 'stage') {
      this.handleStageConnection(ws, instance);
    } else if (role === 'musician') {
      this.handleMusicianConnection(ws, instance);
    } else {
      logger.warn('Connection with unknown role', { role, instanceId });
      ws.close();
    }
  }

  handleStageConnection(ws, instance) {
    logger.info('Stage connected to instance', { instanceId: instance.id });
    instance.stage = ws;

    // Notify stage of existing musicians
    const musicianIds = Array.from(instance.musicians.keys());
    if (musicianIds.length > 0) {
      ws.send(JSON.stringify({
        type: 'musician-list',
        musicians: musicianIds,
      }));
    }
  }

  handleMusicianConnection(ws, instance) {
    const musicianId = ws.session.id;
    logger.info('Musician connected to instance', { instanceId: instance.id, musicianId });
    instance.musicians.set(musicianId, ws);

    // Notify stage of new musician
    if (instance.stage && instance.stage.readyState === 1) {
      instance.stage.send(JSON.stringify({
        type: 'join',
        role: 'musician',
        id: musicianId,
        count: instance.musicians.size,
      }));
    }
  }

  handleDisconnect(ws, instance) {
    const { role, id: sessionId } = ws.session;
    logger.info('Client disconnected', { role, sessionId, instanceId: instance.id });

    if (role === 'stage') {
      logger.warn('Stage disconnected, closing instance', { instanceId: instance.id });
      // Close all musician connections and remove instance
      for (const musician of instance.musicians.values()) {
        musician.close();
      }
      this.instances.delete(instance.id);
    } else if (role === 'musician') {
      instance.musicians.delete(sessionId);
      // Notify stage
      if (instance.stage && instance.stage.readyState === 1) {
        instance.stage.send(JSON.stringify({
          type: 'disconnect',
          role: 'musician',
          id: sessionId,
          count: instance.musicians.size,
        }));
      }
    }
  }

  handleMessage(ws, instance, msg, isBinary) {
    const { role, id: sessionId } = ws.session;

    try {
      if (isBinary) {
        if (role === 'musician' && instance.stage && instance.stage.readyState === 1) {
          // Forward binary sensor data to stage, prepended with musician ID
          const idBytes = Buffer.from(sessionId, 'utf-8');
          const message = Buffer.concat([idBytes, msg]);
          instance.stage.send(message);
        }
      } else {
        const data = JSON.parse(msg.toString());
        if (role === 'stage' && data.type === 'assign-role') {
          this.assignRole(instance, data);
        }
      }
    } catch (err) {
      logger.error('Error processing message', { error: err.message, sessionId, instanceId: instance.id });
    }
  }

  assignRole(instance, data) {
    const { musicianId, role } = data;
    const musician = instance.musicians.get(musicianId);

    if (musician && musician.readyState === 1) {
      musician.send(JSON.stringify({
        type: 'role-assigned',
        role: role,
      }));
      logger.info('Assigned role to musician', { musicianId, role, instanceId: instance.id });
    } else {
      logger.warn('Failed to assign role: musician not found or not ready', { musicianId, instanceId: instance.id });
    }
  }
}

const instances = new InstanceManager();
export default instances;

