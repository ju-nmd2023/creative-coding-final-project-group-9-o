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
      lastActivity: Date.now(),
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
      // Don't destroy instance on stage disconnect - just remove reference
      if (instance.stage === ws) {
        instance.stage = null;
        logger.info('Stage disconnected, instance kept alive', { instanceId: instance.id });
      }
      // Update last activity for cleanup task
      instance.lastActivity = Date.now();
    } else if (role === 'musician') {
      instance.musicians.delete(sessionId);
      // Update last activity for cleanup task
      instance.lastActivity = Date.now();

      // Notify stage if connected
      if (instance.stage && instance.stage.readyState === 1) {
        instance.stage.send(JSON.stringify({
          type: 'musician-left',
          musicianId: sessionId,
          count: instance.musicians.size,
        }));
      }
    }
  }

  // Cleanup task to remove stale instances
  startCleanupTask() {
    const STALE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    const CLEANUP_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes

    setInterval(() => {
      const now = Date.now();
      for (const [instanceId, instance] of this.instances.entries()) {
        // Check if instance has been inactive
        const timeSinceActivity = now - instance.lastActivity;

        if (timeSinceActivity > STALE_TIMEOUT) {
          logger.info('Cleaning up stale instance', {
            instanceId,
            inactiveMinutes: Math.floor(timeSinceActivity / 60000)
          });

          // Close all connections
          if (instance.stage && instance.stage.readyState === 1) {
            instance.stage.close();
          }
          for (const musician of instance.musicians.values()) {
            if (musician.readyState === 1) {
              musician.close();
            }
          }

          // Remove instance
          this.instances.delete(instanceId);
        }
      }
    }, CLEANUP_INTERVAL);
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
      }
    } catch (err) {
      logger.error('Error processing message', { error: err.message, sessionId, instanceId: instance.id });
    }
  }


}

const instances = new InstanceManager();

// Start the cleanup task
instances.startCleanupTask();

export default instances;

