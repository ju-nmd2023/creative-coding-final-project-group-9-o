import express from 'express';
import { path } from 'node:fs';
import http from 'node:http';
import { Server } from 'socket.io';
import ensemble from './src/ensemble.js';
import logger from './src/logger.js';

const app = express();

app.use(express.static('public'));

const server = http.createServer(app);
const io = Server(server);

io.on('connection', (socket) => {
  logger.info('Client connected');
  ensemble.add(socket);
});

server.listen(3215, () => {
 
});


