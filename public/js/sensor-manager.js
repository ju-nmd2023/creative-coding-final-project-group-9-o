/**
 * SensorManager - Abstracts device sensor API access
 *
 * Handles permission requests and event listener setup for device sensors.
 * Provides a clean interface for sensor data without exposing browser APIs.
 */
export class SensorManager {
    constructor(options = {}) {
        const {
            mic = false
        } = options;
        this.active = false;
        this.mic = mic ? new Tone.UserMedia() : null;
        this.listeners = {
            motion: [],
            rotation: [],
            orientation: [],
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
            if (typeof DeviceMotionEvent.requestPermission === 'function') {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission !== 'granted') {
                    this._notifyError('Permission denied');
                    return false;
                }
            }
            
            if (this.mic) await this.mic.open();

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
        if (mic) {
            this.mic.stop();
        }
        this.active = false;
    }

    /**
     * Register callback for sensor events
     * @param {string} event - Event type: 'motion', 'rotation', 'orientation', 'error'
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
        this._motionHandler = (e) => {
            if (e.acceleration) {
                this.listeners.motion.forEach(cb => cb({
                    x: e.acceleration.x,
                    y: e.acceleration.y,
                    z: e.acceleration.z
                }));
            }

            if (e.rotationRate) {
                this.listeners.rotation.forEach(cb => cb({
                    alpha: e.rotationRate.alpha,
                    beta: e.rotationRate.beta,
                    gamma: e.rotationRate.gamma
                }));
            }
        };

        this._orientationHandler = (e) => {
            // Provides absolute orientation with magnetometer
            this.listeners.orientation.forEach(cb => cb({
                alpha: e.alpha,   // Z-axis rotation (compass heading)
                beta: e.beta,     // X-axis rotation (pitch)
                gamma: e.gamma,   // Y-axis rotation (roll)
                absolute: e.absolute  // Whether magnetometer is being used
            }));
        };

        window.addEventListener('devicemotion', this._motionHandler);
        window.addEventListener('deviceorientation', this._orientationHandler);
    }

    /**
     * Remove browser event listeners
     */
    _detachListeners() {
        if (this._motionHandler) {
            window.removeEventListener('devicemotion', this._motionHandler);
        }
        if (this._orientationHandler) {
            window.removeEventListener('deviceorientation', this._orientationHandler);
        }
    }

    /**
     * Notify error listeners
     */
    _notifyError(message) {
        this.listeners.error.forEach(cb => cb(message));
    }
}
