import { SensorManager } from './sensor-manager.js';
import { MotionTracker } from './motion-tracker.js';
import { encodeSensorData } from './protocol.js';

// UI elements
const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');
const startBtn = document.getElementById('start');

// WebSocket connection
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const socket = new WebSocket(`${protocol}//${window.location.host}`);
socket.binaryType = 'arraybuffer';

// Core systems
const sensorManager = new SensorManager();
const motionTracker = new MotionTracker();

let active = false;

window._cc_project_role = 'musician';

// WebSocket connection handlers
socket.onopen = () => {
    statusEl.textContent = 'Connected';
    socket.send(JSON.stringify({
        type: 'identify',
        role: 'musician'
    }));
};

socket.onclose = () => {
    statusEl.textContent = 'Disconnected';
};

socket.onerror = (error) => {
    console.error('WebSocket error:', error);
    statusEl.textContent = 'Connection Error';
};

// Wire up sensor data to motion tracker
sensorManager.on('rotation', (data) => {
    if (!active) return;
    motionTracker.updateRotationRate(data.alpha, data.beta, data.gamma);
});

sensorManager.on('motion', (data) => {
    if (!active) return;
    motionTracker.updateMotion(data.x, data.y, data.z);
});

sensorManager.on('error', (message) => {
    alert(message);
});

// Send state updates to server as binary
motionTracker.on('update', (state) => {
    debugEl.textContent = JSON.stringify(state, null, 2);

    if (socket.readyState === WebSocket.OPEN) {
        const binaryData = encodeSensorData(state, false); // TODO: add shake detection
        socket.send(binaryData);
    }
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

