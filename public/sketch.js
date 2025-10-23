// const canvas = document.querySelector('#p5-main');

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
    colorMode(HSL);
}

let quaternion = { x: 0, y: 0, z: 0, w: 1 };

// Listen for devicemotion to get rotation rate and calculate quaternion
let rotationRate = { alpha: 0, beta: 0, gamma: 0 };

addEventListener('devicemotion', (e) => {
    if (e.rotationRate) {
        rotationRate.alpha = e.rotationRate.alpha || 0;
        rotationRate.beta = e.rotationRate.beta || 0;
        rotationRate.gamma = e.rotationRate.gamma || 0;
    }
});

function updateQuaternion(dt) {
    // Convert rotation rate from degrees/s to radians/s
    const wx = rotationRate.alpha * Math.PI / 180;
    const wy = rotationRate.beta * Math.PI / 180;
    const wz = rotationRate.gamma * Math.PI / 180;

    const q = quaternion;

    // Quaternion derivative from angular velocity
    const qDot = {
        w: 0.5 * (-q.x * wx - q.y * wy - q.z * wz),
        x: 0.5 * (q.w * wx + q.y * wz - q.z * wy),
        y: 0.5 * (q.w * wy + q.z * wx - q.x * wz),
        z: 0.5 * (q.w * wz + q.x * wy - q.y * wx)
    };

    // Integrate
    quaternion.w += qDot.w * dt;
    quaternion.x += qDot.x * dt;
    quaternion.y += qDot.y * dt;
    quaternion.z += qDot.z * dt;

    // Normalize
    const mag = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
    if (mag > 0) {
        quaternion.w /= mag;
        quaternion.x /= mag;
        quaternion.y /= mag;
        quaternion.z /= mag;
    }
}

function quaternionToEuler(q) {
    // Convert quaternion to Euler angles
    // This gives us yaw (rotation around Z)
    const yaw = Math.atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z));
    return yaw * 180 / Math.PI; // Convert to degrees
}

let lastTime = Date.now();

function draw() {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    updateQuaternion(dt);

    // Map quaternion to hue (0-360)
    const angle = quaternionToEuler(quaternion);
    const hue = ((angle % 360) + 360) % 360; // Ensure positive

    background(Math.floor(hue), 100, 60);
}

