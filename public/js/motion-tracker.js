/**
 * MotionTracker - Abstracts device sensor integration
 *
 * Maintains orientation as a quaternion calculated from rotation rate.
 * Uses fixed timestep loop for consistent integration.
 */
export class MotionTracker {
    constructor(updateRate = 14) {
        this.tracking = false;
        this.quaternion = { x: 0, y: 0, z: 0, w: 1 }; // Identity quaternion
        this.initialized = false; // Whether we've received absolute orientation

        this.acceleration = { x: 0, y: 0, z: 0 };
        this.rotationRate = { alpha: 0, beta: 0, gamma: 0 }; // deg/s

        this.listeners = {
            update: []
        };

        this.updateRate = updateRate;
        this.dt = 1 / updateRate;
        this.intervalId = null;
    }

    /**
     * Register callback for state updates
     * @param {string} event - Event name ('update')
     * @param {function} callback - Called with {tracking, acceleration, rotationRate, quaternion}
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * Start the integration loop
     */
    start() {
        if (this.intervalId) return;

        this.intervalId = setInterval(() => {
            this._integrate();
            this._notifyListeners();
        }, 1000 / this.updateRate);
    }

    /**
     * Stop the integration loop
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Start tracking (called on touch start)
     */
    startTracking() {
        this.tracking = true;
    }

    /**
     * Stop tracking (called on touch end)
     */
    stopTracking() {
        this.tracking = false;
    }

    /**
     * Update rotation rate from device motion event
     */
    updateRotationRate(alpha, beta, gamma) {
        this.rotationRate = {
            alpha: alpha || 0,
            beta: beta || 0,
            gamma: gamma || 0
        };
    }

    /**
     * Update latest acceleration reading from device motion event
     */
    updateMotion(accelX, accelY, accelZ) {
        this.acceleration = {
            x: accelX || 0,
            y: accelY || 0,
            z: accelZ || 0
        };
    }

    updateMic(gain) {

    }

    /**
     * Initialize quaternion from absolute orientation (magnetometer)
     * @param {object} quaternion - Initial quaternion from Euler angles
     */
    setInitialOrientation(quaternion) {
        if (!this.initialized) {
            this.quaternion = { ...quaternion };
            // Invert pitch (x component) to fix reversed direction
            this.quaternion.x = -this.quaternion.x;
            this.initialized = true;
        }
    }

    /**
     * Perform integration step with fixed timestep
     */
    _integrate() {
        const dt = this.dt;

        // Update quaternion from rotation rate
        this._updateQuaternion(dt);
    }


    /**
     * Update quaternion from rotation rate (gyroscope)
     * Integrates angular velocity to update orientation quaternion
     */
    _updateQuaternion(dt) {
        // Convert rotation rate from degrees/s to radians/s
        const wx = this.rotationRate.alpha * Math.PI / 180;
        const wy = this.rotationRate.beta * Math.PI / 180;
        const wz = this.rotationRate.gamma * Math.PI / 180;

        // Current quaternion
        const q = this.quaternion;

        // Quaternion derivative from angular velocity
        // q_dot = 0.5 * omega * q
        // where omega is the quaternion (0, wx, wy, wz)
        const qDot = {
            w: 0.5 * (-q.x * wx - q.y * wy - q.z * wz),
            x: 0.5 * (q.w * wx + q.y * wz - q.z * wy),
            y: 0.5 * (q.w * wy + q.z * wx - q.x * wz),
            z: 0.5 * (q.w * wz + q.x * wy - q.y * wx)
        };

        // Integrate using Euler method
        this.quaternion.w += qDot.w * dt;
        this.quaternion.x += qDot.x * dt;
        this.quaternion.y += qDot.y * dt;
        this.quaternion.z += qDot.z * dt;

        // Normalize to prevent drift
        this._normalizeQuaternion();
    }

    /**
     * Normalize quaternion to unit length
     */
    _normalizeQuaternion() {
        const q = this.quaternion;
        const mag = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);

        if (mag > 0) {
            q.w /= mag;
            q.x /= mag;
            q.y /= mag;
            q.z /= mag;
        }
    }


    /**
     * Get current state snapshot
     */
    getState() {
        return {
            tracking: this.tracking,
            quaternion: { ...this.quaternion },
            acceleration: { ...this.acceleration },
            rotationRate: { ...this.rotationRate },
        };
    }

    /**
     * Notify all update listeners
     */
    _notifyListeners() {
        const state = this.getState();
        this.listeners.update.forEach(cb => cb(state));
    }
}
