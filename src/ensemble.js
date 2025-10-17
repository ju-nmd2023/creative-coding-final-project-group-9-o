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
        }
      } catch (err) {
        logger.error('Error parsing message from websocket: ', err);
      }
    });

    ws.on('close', () => {
      if (ws.data.role === 'conductor') {
        logger.warn('Conductor disconnected');
        this.conductor = null;
      } else {
        this.musicians.delete(ws);
      }
    });

    ws.on('error', err => {
      logger.error('Websocket error: ', err);
    });

    this.updateClientCount();
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
}

const ensemble = new Ensemble();
export default ensemble;

