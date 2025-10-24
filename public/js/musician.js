import { SensorManager } from './sensor-manager.js';
import { MotionTracker } from './motion-tracker.js';
import { encodeSensorData } from './protocol.js';

// Export initialization function that sets up the musician system
export function initMusician(mic = false) {
    // WebSocket connection with auto-reconnect
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    let socket;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_DELAY = 30000; // 30 seconds
    const INITIAL_RECONNECT_DELAY = 1000; // 1 second

    // Core systems
    const sensorManager = new SensorManager({ mic });
    const motionTracker = new MotionTracker(12, sensorManager.mic);

    let active = false;

    // Callbacks for external UI
    let statusCallback = null;
    let sensorUpdateCallback = null;
    let roleAssignedCallback = null;

    window._cc_project_role = 'musician';

    function connect() {
        socket = new WebSocket(wsUrl);
        socket.binaryType = 'arraybuffer';

        socket.onopen = () => {
            console.log('Musician connected to server');
            if (statusCallback) statusCallback('Connected');
            reconnectAttempts = 0;
            socket.send(JSON.stringify({
                type: 'identify',
                role: 'musician'
            }));
        };

        socket.onmessage = (event) => {
            if (typeof event.data === 'string') {
                // Text message - control message
                const data = JSON.parse(event.data);
                if (data.type === 'role-assigned') {
                    console.log('Role assigned:', data.role);
                    if (roleAssignedCallback) {
                        roleAssignedCallback(data.role);
                    }
                    if (statusCallback) {
                        statusCallback(`Connected - Role: ${data.role}`);
                    }
                }
            }
        };

        socket.onclose = () => {
            console.log('WebSocket disconnected, attempting to reconnect...');
            if (statusCallback) statusCallback('Disconnected - Reconnecting...');
            reconnect();
        };

        socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            if (statusCallback) statusCallback('Connection Error');
        };
    }

    function reconnect() {
        const delay = Math.min(
            INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts),
            MAX_RECONNECT_DELAY
        );
        const jitter = Math.random() * 1000;

        reconnectAttempts++;
        const waitTime = Math.round((delay + jitter) / 1000);
        const message = `Reconnecting in ${waitTime}s (attempt ${reconnectAttempts})...`;
        if (statusCallback) statusCallback(message);
        console.log(message);

        setTimeout(() => {
            connect();
        }, delay + jitter);
    }

    // Initial connection
    connect();

    // Wire up sensor data to motion tracker
    sensorManager.on('rotation', (data) => {
        if (!active) return;
        motionTracker.updateRotationRate(data.alpha, data.beta, data.gamma);
    });

    sensorManager.on('motion', (data) => {
        if (!active) return;
        motionTracker.updateMotion(data.x, data.y, data.z);
    });

    // sensorManager.on('orientation', (data) => {
    //     if (!active) return;
    //     // Use absolute orientation to initialize quaternion
    //     const initialQuat = eulerToQuaternion(data.alpha, data.beta, data.gamma);
    //     motionTracker.setInitialOrientation(initialQuat);
    // });

    sensorManager.on('error', (message) => {
        alert(message);
    });

    // Prepare and send sensor data
    motionTracker.on('update', (state) => {
        // Notify external callback with prepared data
        if (sensorUpdateCallback) {
            sensorUpdateCallback(state);
        }

        // Send to server
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

    // Public API
    return {
        async start() {
            const success = await sensorManager.start();
            if (success) {
                active = true;
                motionTracker.start();
            }
            return success;
        },

        stop() {
            active = false;
            sensorManager.stop();
            motionTracker.stop();
        },

        onStatusChange(callback) {
            statusCallback = callback;
        },

        onSensorUpdate(callback) {
            sensorUpdateCallback = callback;
        },

        onRoleAssigned(callback) {
            roleAssignedCallback = callback;
        }
    };
}

// Quaternion utility functions

/**
 * Convert Euler angles (in degrees) to quaternion
 * Uses ZXY rotation order (alpha, beta, gamma)
 * @param {number} alpha - Z-axis rotation (heading)
 * @param {number} beta - X-axis rotation (pitch)
 * @param {number} gamma - Y-axis rotation (roll)
 */
export function eulerToQuaternion(alpha, beta, gamma) {
    // Convert to radians
    const a = (alpha || 0) * Math.PI / 180;
    const b = (beta || 0) * Math.PI / 180;
    const g = (gamma || 0) * Math.PI / 180;

    // Calculate half angles
    const c1 = Math.cos(a / 2);
    const c2 = Math.cos(b / 2);
    const c3 = Math.cos(g / 2);
    const s1 = Math.sin(a / 2);
    const s2 = Math.sin(b / 2);
    const s3 = Math.sin(g / 2);

    // ZXY order
    return {
        w: c1 * c2 * c3 - s1 * s2 * s3,
        x: c1 * s2 * c3 - s1 * c2 * s3,
        y: c1 * c2 * s3 + s1 * s2 * c3,
        z: s1 * c2 * c3 + c1 * s2 * s3
    };
}

export function quaternionToAxisAngle(q) {
    // Convert quaternion to axis-angle representation
    const angle = 2 * Math.acos(q.w);
    const s = Math.sqrt(1 - q.w * q.w);

    let x, y, z;
    if (s > 0.001) {
        x = q.x / s;
        y = q.y / s;
        z = q.z / s;
    } else {
        // If s is very small, use quaternion components directly
        x = q.x;
        y = q.y;
        z = q.z;
    }

    return { angle, axis: [x, y, z] };
}

export function slerpQuaternions(q1, q2, t) {
    // Spherical linear interpolation between two quaternions
    // t is the interpolation factor (0 to 1)

    // Clamp t to [0, 1]
    t = Math.max(0, Math.min(1, t));

    // Calculate dot product
    let dot = q1.w * q2.w + q1.x * q2.x + q1.y * q2.y + q1.z * q2.z;

    // If dot is negative, negate q2 to take shorter path
    let q2Copy = { ...q2 };
    if (dot < 0) {
        q2Copy.w = -q2.w;
        q2Copy.x = -q2.x;
        q2Copy.y = -q2.y;
        q2Copy.z = -q2.z;
        dot = -dot;
    }

    // If quaternions are very close, use linear interpolation
    if (dot > 0.9995) {
        return {
            w: q1.w + t * (q2Copy.w - q1.w),
            x: q1.x + t * (q2Copy.x - q1.x),
            y: q1.y + t * (q2Copy.y - q1.y),
            z: q1.z + t * (q2Copy.z - q1.z)
        };
    }

    // Calculate angle between quaternions
    const theta0 = Math.acos(dot);
    const theta = theta0 * t;
    const sinTheta = Math.sin(theta);
    const sinTheta0 = Math.sin(theta0);

    const s1 = Math.cos(theta) - dot * sinTheta / sinTheta0;
    const s2 = sinTheta / sinTheta0;

    return {
        w: s1 * q1.w + s2 * q2Copy.w,
        x: s1 * q1.x + s2 * q2Copy.x,
        y: s1 * q1.y + s2 * q2Copy.y,
        z: s1 * q1.z + s2 * q2Copy.z
    };
}

