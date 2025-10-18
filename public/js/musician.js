import { SensorManager } from './sensor-manager.js';
import { MotionTracker } from './motion-tracker.js';

// UI elements
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');
const startBtn = document.getElementById('start');

// Socket connection
const socket = io();

// Core systems
const sensorManager = new SensorManager();
const motionTracker = new MotionTracker();

let active = false;

// Socket connection handlers
socket.on('connect', () => {
    statusEl.textContent = 'Connected';
    socket.emit('message', JSON.stringify({
        type: 'identify',
        role: 'musician'
    }));
});

socket.on('disconnect', () => {
    statusEl.textContent = 'Disconnected';
});

// Wire up sensor data to motion tracker
sensorManager.on('orientation', (data) => {
    if (!active) return;
    motionTracker.updateOrientation(data.alpha, data.beta, data.gamma);
});

sensorManager.on('motion', (data) => {
    if (!active) return;
    motionTracker.updateMotion(data.x, data.y, data.z);
});

sensorManager.on('error', (message) => {
    alert(message);
});

// Send state updates to server
motionTracker.on('update', (state) => {
    debugEl.textContent = JSON.stringify(state, null, 2);

    socket.emit('message', JSON.stringify({
        type: 'sensorData',
        payload: state
    }));
});

// Touch handlers for position tracking
document.body.addEventListener('touchstart', () => {
    if (!active) return;
    motionTracker.startTracking();
});

document.body.addEventListener('touchend', () => {
    if (!active) return;
    motionTracker.stopTracking();
});

// Start/stop button
startBtn.addEventListener('click', async () => {
    if (active) {
        active = false;
        sensorManager.stop();
        motionTracker.stop();
        startBtn.textContent = 'Start Sending Data';
        return;
    }

    const success = await sensorManager.start();
    if (success) {
        active = true;
        motionTracker.start();
        startBtn.textContent = 'Stop Sending Data';
    }
});

