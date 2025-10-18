import logger from './logger.js';

class Ensemble {
  constructor() {
    this.musicians = new Set();
    this.conductor = null;
  }

  add(ws) {
    ws.on('message', msg => {
      let data = null;
      try {
        data = JSON.parse(msg);
        if (data.type === 'identify') {
          this.register(ws, data);
        } else if (data.type === 'sensorData') {
          this.broadcastSensorData(ws, data);
        }
      } catch (err) {
        logger.error('Error parsing message from websocket: ', err);
      }
    });

    ws.on('disconnect', () => {
      logger.info('Client disconnected', { id: ws.id, role: ws.data?.role });

      if (ws.data?.role === 'conductor') {
        logger.warn('Conductor disconnected');
        this.conductor = null;
      } else if (ws.data?.role === 'musician') {
        this.musicians.delete(ws);
        this.conductor.send(JSON.stringify({
          type: 'disconnect',
          musicianId: ws.id,
        }));
        logger.info('Musician removed', { remaining: this.musicians.size });
      }

      this.updateClientCount();
    });

    ws.on('error', err => {
      logger.error('Websocket error: ', err);
    });
  }

  register(ws, data) {
    ws.data.role = data.role;
    if (data.role === 'conductor') {
      this.conductor = ws;
      logger.info('Conductor registered');
    } else {
      ws.join("ensemble");
      this.musicians.add(ws);
      logger.info('Musician registered');
    }

    this.updateClientCount();
  }

  updateClientCount() {
    if (this.conductor) {
      this.conductor.send(JSON.stringify({
        type: 'clientCount',
        count: this.musicians.size
      }));
    }
  }

  broadcastSensorData(ws, data) {
    if (this.conductor && ws.data.role === 'musician') {
      this.conductor.send(JSON.stringify({
        type: 'sensorData',
        musicianId: ws.id,
        data: data.payload
      }));
    }
  }
}

const ensemble = new Ensemble();
export default ensemble;

