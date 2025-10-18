/**
 * SensorManager - Abstracts device sensor API access
 *
 * Handles permission requests and event listener setup for device sensors.
 * Provides a clean interface for sensor data without exposing browser APIs.
 */
export class SensorManager {
    constructor() {
        this.active = false;
        this.listeners = {
            orientation: [],
            motion: [],
            error: []
        };
    }

    /**
     * Request permissions and start sensor monitoring
     * @returns {Promise<boolean>} - true if successful
     */
    async start() {
        try {
            // Request permission for iOS 13+
            if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                const permission = await DeviceOrientationEvent.requestPermission();
                if (permission !== 'granted') {
                    this._notifyError('Permission denied');
                    return false;
                }
            }

            this._attachListeners();
            this.active = true;
            return true;

        } catch (error) {
            this._notifyError(error.message);
            return false;
        }
    }

    /**
     * Stop sensor monitoring
     */
    stop() {
        this._detachListeners();
        this.active = false;
    }

    /**
     * Register callback for sensor events
     * @param {string} event - Event type: 'orientation', 'motion', 'error'
     * @param {function} callback - Called with sensor data
     */
    on(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event].push(callback);
        }
    }

    /**
     * Attach browser event listeners
     */
    _attachListeners() {
        this._orientationHandler = (e) => {
            this.listeners.orientation.forEach(cb => cb({
                alpha: e.alpha,
                beta: e.beta,
                gamma: e.gamma
            }));
        };

        this._motionHandler = (e) => {
            if (e.acceleration) {
                this.listeners.motion.forEach(cb => cb({
                    x: e.acceleration.x,
                    y: 0, z: 0,
                    // y: e.acceleration.y,
                    // z: e.acceleration.z
                }));
            }
        };

        window.addEventListener('deviceorientation', this._orientationHandler);
        window.addEventListener('devicemotion', this._motionHandler);
    }

    /**
     * Remove browser event listeners
     */
    _detachListeners() {
        if (this._orientationHandler) {
            window.removeEventListener('deviceorientation', this._orientationHandler);
        }
        if (this._motionHandler) {
            window.removeEventListener('devicemotion', this._motionHandler);
        }
    }

    /**
     * Notify error listeners
     */
    _notifyError(message) {
        this.listeners.error.forEach(cb => cb(message));
    }
}
