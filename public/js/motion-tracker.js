/**
 * MotionTracker - Abstracts device sensor integration and position tracking
 *
 * Tracks relative position by integrating accelerometer data while touch is active.
 * Position resets when touch is released to prevent drift accumulation.
 * Uses fixed timestep loop for consistent integration.
 */
export class MotionTracker {
    constructor(updateRate = 24, deadzone = 0.5) {
        this.tracking = false;
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.orientation = { alpha: 0, beta: 0, gamma: 0 };

        this.acceleration = { x: 0, y: 0, z: 0 };

        this.listeners = {
            update: []
        };

        this.updateRate = updateRate;
        this.dt = 1 / updateRate;
        this.deadzone = deadzone; // m/s² threshold
        this.intervalId = null;
    }

    /**
     * Register callback for state updates
     * @param {string} event - Event name ('update')
     * @param {function} callback - Called with {acceleration, position, velocity, orientation}
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
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.acceleration = { x: 0, y: 0, z: 0 };
    }

    /**
     * Stop tracking (called on touch end)
     */
    stopTracking() {
        this.tracking = false;
    }

    /**
     * Update orientation from device orientation event
     */
    updateOrientation(alpha, beta, gamma) {
        this.orientation = { alpha, beta, gamma };
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
     * Perform integration step with fixed timestep
     */
    _integrate() {
        if (!this.tracking) return;

        const dt = this.dt;

        // Rotate acceleration from device frame to world frame
        const worldAccel = this._rotateToWorldFrame(
            this.acceleration,
            this.orientation
        );

        // Apply deadzone to reduce noise and drift
        const filteredAccel = this._applyDeadzone(worldAccel);

        // Integrate acceleration to get velocity
        this.velocity.x += this.acceleration.x * dt;
        this.velocity.y += this.acceleration.y * dt;
        this.velocity.z += this.acceleration.z * dt;

        // Integrate velocity to get position
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;
    }

    /**
     * Apply deadzone to acceleration to ignore small values
     */
    _applyDeadzone(accel) {
        return {
            x: Math.abs(accel.x) < this.deadzone ? 0 : accel.x,
            y: Math.abs(accel.y) < this.deadzone ? 0 : accel.y,
            z: Math.abs(accel.z) < this.deadzone ? 0 : accel.z
        };
    }

    /**
     * Rotate acceleration vector from device frame to Earth frame
     * using device orientation (alpha, beta, gamma)
     */
    _rotateToWorldFrame(accel, orientation) {
        // Convert angles to radians
        const alpha = (orientation.alpha || 0) * Math.PI / 180;
        const beta = (orientation.beta || 0) * Math.PI / 180;
        const gamma = (orientation.gamma || 0) * Math.PI / 180;

        // Rotation matrices for device orientation
        // Order: Z (alpha) -> X (beta) -> Y (gamma)

        const ca = Math.cos(alpha);
        const sa = Math.sin(alpha);
        const cb = Math.cos(beta);
        const sb = Math.sin(beta);
        const cg = Math.cos(gamma);
        const sg = Math.sin(gamma);

        // Combined rotation matrix (simplified)
        const x = accel.x * (ca * cg + sa * sb * sg) +
                  accel.y * (cb * sg) +
                  accel.z * (sa * cg - ca * sb * sg);

        const y = accel.x * (-ca * sg + sa * sb * cg) +
                  accel.y * (cb * cg) +
                  accel.z * (-sa * sg - ca * sb * cg);

        const z = accel.x * (sa * cb) +
                  accel.y * (-sb) +
                  accel.z * (ca * cb);

        return { x, y, z };
    }

    /**
     * Get current state snapshot
     */
    getState() {
        return {
            tracking: this.tracking,
            position: { ...this.position },
            velocity: { ...this.velocity },
            orientation: { ...this.orientation },
            acceleration: { ...this.acceleration },
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
