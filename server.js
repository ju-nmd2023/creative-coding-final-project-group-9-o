import express from 'express';
import http from 'node:http';
import { Server } from 'socket.io';
import ensemble from './src/ensemble.js';
import logger from './src/logger.js';

const app = express();

app.use(express.static('public'));

const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  logger.info('Client connected');
  ensemble.add(socket);
});

server.listen(3215, () => {
  logger.info('Server is up'); 
});


