// Configuration constants for dynamic normalization
const AMBIENT_DECAY = 0.995;
const AMBIENT_RISE_RATE = 0.001;
const THRESHOLD = 1; // Minimum dB difference above noise floor to count as a blow
const SCALING_FACTOR = 5; // Scales the dB difference to the 0-100 range

/**
 * MotionTracker - Abstracts device sensor integration
 *
 * Maintains orientation as a quaternion calculated from rotation rate.
 * Uses fixed timestep loop for consistent integration.
 */
export class MotionTracker {
    constructor(updateRate = 14, mic) {
        this.tracking = false;
        this.quaternion = { x: 0, y: 0, z: 0, w: 1 }; // Identity quaternion
        this.initialized = false; // Whether we've received absolute orientation

        this.acceleration = { x: 0, y: 0, z: 0 };
        this.rotationRate = { alpha: 0, beta: 0, gamma: 0 }; // deg/s

        this.listeners = {
            update: []
        };

        if (mic) {
            this.mic = mic;
            this.blowingStrength = 0;
            this.noiseFloor = -100;

            this.ambientMeter = new Tone.Meter();
            this.blowingFilter = new Tone.Filter(300, 'lowpass');
            this.filteredMeter = new Tone.Meter({ smoothing: 0.01 });

            this.mic.connect(this.ambientMeter);
            this.mic.chain(this.blowingFilter, this.filteredMeter);
        }

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
            if (this.mic) this._processAudio();
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

    _processAudio() {
        const db = this.filteredMeter.getValue();
        this.blowingStrength = Math.max(0, Math.min(10, (db + 60) / 6));
        return;

        const V_current = this.ambientMeter.getValue();  // Total volume (dB)
        const V_filtered = this.filteredMeter.getValue();    // Low-frequency volume (dB)

        // 1. Update Dynamic Noise Floor
        // Noise floor slowly decays when quiet, but rises quickly to sustained background noise
        this.noiseFloor *= AMBIENT_DECAY;
        if (V_current > this.noiseFloor && V_filtered < this.noiseFloor * 0.4) {
            this.noiseFloor += (V_current - this.noiseFloor) * AMBIENT_RISE_RATE;
        }

        // 2. Calculate Relative Loudness (using the filtered signal)
        const L_relative = V_filtered - this.noiseFloor;
        
        let strength = 0;
        
        if (L_relative > THRESHOLD) {
            // Apply threshold and scale the result
            const effective_db = L_relative - THRESHOLD;
            // Scale and clamp the final strength
            strength = Math.min(100, effective_db * SCALING_FACTOR);
        }

        this.blowingStrength = strength;
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
            blowingStrength: this.blowingStrength,
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
