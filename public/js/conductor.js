import { decodeSensorData } from './protocol.js';

// Track musicians by ID
export const musicians = new Map();

window._cc_project_role = 'conductor';

// WebSocket connection with auto-reconnect
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}`;

let socket;
let reconnectAttempts = 0;
const MAX_RECONNECT_DELAY = 30000; // 30 seconds
const INITIAL_RECONNECT_DELAY = 1000; // 1 second

function connect() {
    socket = new WebSocket(wsUrl);
    socket.binaryType = 'arraybuffer';

    socket.onopen = () => {
        console.log('Conductor connected to server');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        socket.send(JSON.stringify({
            type: 'identify',
            role: 'conductor'
        }));
    };

    socket.onmessage = (event) => {
        if (typeof event.data === 'string') {
            // Text message - control message
            const data = JSON.parse(event.data);
            if (data.type === 'join' || data.type === 'disconnect') {
                if (data.role === 'musician') {
                    window.dispatchEvent(new CustomEvent('musician', {
                        detail: data,
                    }));
                }
                if (data.type === 'disconnect') {
                    musicians.delete(data.id);
                }
            } else if (data.type === 'musician-list') {
                data.musicians.forEach(m => {
                    window.dispatchEvent(new CustomEvent('musician', {
                        detail: {
                            id: m,
                            type: 'join',
                            role: 'musician'
                        }
                    }));
                });
            }
        } else {
            // Binary message - sensor data
            const data = decodeSensorData(event.data);
            musicians.set(data.musicianId, data);
        }
    };

    socket.onclose = () => {
        console.log('WebSocket disconnected, attempting to reconnect...');
        reconnect();
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function reconnect() {
    // Exponential backoff with jitter
    const delay = Math.min(
        INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
        MAX_RECONNECT_DELAY
    );
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter

    reconnectAttempts++;
    console.log(`Reconnecting in ${Math.round((delay + jitter) / 1000)}s (attempt ${reconnectAttempts})...`);

    setTimeout(() => {
        connect();
    }, delay + jitter);
}

// Initial connection
connect();

// Function to assign role to a musician
export function assignRole(musicianId, role) {
    if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
            type: 'assign-role',
            musicianId: musicianId,
            role: role
        }));
        console.log(`Assigned role "${role}" to musician ${musicianId}`);
    } else {
        console.error('Cannot assign role: socket not connected');
    }
}

export { socket };
