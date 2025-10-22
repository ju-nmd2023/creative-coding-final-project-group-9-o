import express from 'express';
import http from 'node:http';
import { WebSocketServer } from 'ws';
import ensemble from './src/ensemble.js';
import logger from './src/logger.js';

const app = express();

app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  logger.info('Client connected');
  ensemble.add(ws);
});

server.listen(3215, () => {
  logger.info('Server is up');
});


