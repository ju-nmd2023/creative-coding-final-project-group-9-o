import { initMusician, quaternionToAxisAngle, slerpQuaternions } from '../musician.js';

// Initialize musician system
const { start, stop, onStatusChange, onSensorUpdate, onRoleAssigned, setMicLevel } = initMusician(true); // use mic

let sensorState = null;
let role = null;
let startTime = null;
let introTime = null;

let inIntro = true;
let introDuration = 3000;
const fadeInDuration = 1000; // 1 second fade in
const cubeSize = 150;

// For smooth interpolation
let currentQuaternion = null;
let targetQuaternion = null;
const interpolationSpeed = 0.2; // Adjust this for faster/slower interpolation (0-1)

// Ring configuration for polyrhythmic dots
const ringParams = {
    numRings: 8,
    dotsPerRing: 12,
    dotSize: 8,
    smallestRadius: 180,
    ringSpacing: 40,
    baseSpeed: 1,
    speedDecay: 0.01,
};

let ringSpeed = ringParams.baseSpeed;

// Generate ring configurations
const rings = [];

let ringShift = 0;

// Time role visualization state
let timeValue = 0;

function timeRole() {
    const t = millis() - startTime;
    background(10, 15, 30); // Dark night sky background

    // Calculate fade-in alpha
    const alpha = inIntro ? map(t, 0, fadeInDuration, 0, 255, true) : 255;

    // Update time value based on beta rotation rate (matches prairie.js:94)
    if (sensorState && sensorState.rotationRate) {
        const dt = deltaTime / 1000;
        // Use beta (x-axis rotation) turn speed to update time
        // Scale rotation rate to time change (360 deg/s = 1 full day/s)
        const timeSpeed = sensorState.rotationRate.beta / 360;
        timeValue += timeSpeed * dt;

        // Wrap around [0, 1]
        timeValue = timeValue % 1;
        if (timeValue < 0) timeValue += 1;
    }

    // Apply 3D rotation to make it look dimensional
    // Tilt the orbital plane to create depth
    push();

    // Rotate based on device orientation if available, otherwise use auto-rotation
    if (sensorState && sensorState.orientation) {
        // Use device pitch and roll to control view angle
        rotateX(sensorState.orientation.beta * 0.01); // Pitch
        rotateY(sensorState.orientation.alpha * 0.01); // Yaw
    } else {
        // Fallback: gentle auto-rotation for visual interest
        rotateX(0.3); // Tilt forward slightly
        rotateY(t / 5000); // Slow rotation over time
    }

    // Convert time value to angle for orbital positions
    const angle = timeValue * TWO_PI - HALF_PI; // Start at bottom

    // Orbital parameters
    const orbitRadius = 200;

    // Calculate sun position (orbiting in the tilted plane)
    const sunAngle = angle;
    const sunX = cos(sunAngle) * orbitRadius;
    const sunY = sin(sunAngle) * orbitRadius;
    const sunZ = 0; // Stays in the orbital plane

    // Calculate moon position (opposite side)
    const moonAngle = angle + PI;
    const moonX = cos(moonAngle) * orbitRadius;
    const moonY = sin(moonAngle) * orbitRadius;
    const moonZ = 0;

    // Draw orbit path as a 3D ellipse/circle
    push();
    noFill();
    stroke(255, 255, 255, alpha * 0.2);
    strokeWeight(2);
    beginShape();
    for (let a = 0; a < TWO_PI; a += 0.1) {
        const x = cos(a) * orbitRadius;
        const y = sin(a) * orbitRadius;
        vertex(x, y, 0);
    }
    endShape(CLOSE);
    pop();

    // Draw sun
    push();
    translate(sunX, sunY, sunZ);
    noStroke();
    // Sun glow
    for (let i = 3; i > 0; i--) {
        fill(255, 220, 0, alpha * 0.1 * i);
        sphere(30 + i * 10);
    }
    fill(255, 220, 0, alpha);
    sphere(30);
    pop();

    // Draw moon
    push();
    translate(moonX, moonY, moonZ);
    noStroke();
    // Moon glow
    for (let i = 2; i > 0; i--) {
        fill(240, 240, 255, alpha * 0.1 * i);
        sphere(25 + i * 8);
    }
    fill(240, 240, 255, alpha);
    sphere(25);
    // Add some craters
    fill(220, 220, 235, alpha);
    translate(-5, -3, 20);
    sphere(6);
    translate(10, 8, -5);
    sphere(4);
    pop();

    // Draw central sphere (Earth)
    push();
    noStroke();
    // Subtle glow
    fill(50, 150, 200, alpha * 0.3);
    sphere(60);
    fill(50, 150, 200, alpha);
    sphere(50);
    pop();

    pop(); // End 3D rotation

    // Display time value as text (in screen space, not rotated)
    push();
    fill(255, alpha);
    textAlign(CENTER, CENTER);
    textSize(20);
    text(`Time: ${(timeValue * 24).toFixed(1)}h`, 0, height/2 - 50);
    pop();
}

function pinwheel() {
    const t = millis() - startTime;
    background(0);

    // Calculate fade-in alpha
    const alpha = inIntro ? map(t, 0, fadeInDuration, 0, 255, true) : 255;

    // Update target quaternion when new sensor data arrives
    if (sensorState && sensorState.quaternion) {
        targetQuaternion = sensorState.quaternion;

        // Initialize current quaternion on first update
        if (currentQuaternion === null) {
            currentQuaternion = { ...targetQuaternion };
        }
    }

    // Interpolate between current and target quaternion for smooth rotation
    if (currentQuaternion && targetQuaternion) {
        // Slerp towards target quaternion
        currentQuaternion = slerpQuaternions(currentQuaternion, targetQuaternion, interpolationSpeed);

        // Convert interpolated quaternion to axis-angle for p5.js
        const { angle, axis } = quaternionToAxisAngle(currentQuaternion);

        // Apply rotation
        rotate(angle, [-axis[0], axis[1], axis[2]]);
    }

    // Draw concentric rings of dots with polyrhythmic rotation
    push();
    colorMode(HSB, 360, 100, 100, 255);

    for (let ring of rings) {
        const angleStep = TWO_PI / ringParams.dotsPerRing;

        for (let i = 0; i < ringParams.dotsPerRing; i++) {
            const angle = i * angleStep + ring.angle;
            const x = cos(angle) * ring.radius;
            const y = sin(angle) * ring.radius;

            push();
            translate(x, y, 0);
            noStroke();
            fill(ring.hue, 80, 90, alpha);
            sphere(ringParams.dotSize);
            pop();
        }

        ring.angle = (ring.angle + (deltaTime / 1000) * ring.speedMult * ringSpeed);
    }

    pop();

    // Draw central cube
    push();
    stroke(0);
    strokeWeight(3);
    fill(200, 50, 8, alpha);
    box(cubeSize);
    pop();

    let blowing = sensorState?.blowingStrength ?? 0;
    ringSpeed = Math.max(0, ringSpeed - ringParams.speedDecay + blowing * 0.01);
    ringSpeed = Math.min(ringSpeed, 5);
    ringShift = (ringShift + ringSpeed * (t/1000)) % TWO_PI;
}

window.setup = function() {
    createCanvas(innerWidth, innerHeight, WEBGL);
    background(0);

    // Handle status updates
    onStatusChange((status) => {
        console.log('Status:', status);
    });

    // Handle sensor data updates
    onSensorUpdate((state) => {
        sensorState = state;
    });

    // Handle role assignment
    onRoleAssigned(async (assignedRole) => {
        console.log('Assigned role:', assignedRole);
        role = assignedRole;
        startTime = millis();
        start();
        loop();
    });

    for (let i = 0; i < ringParams.numRings; i++) {
        rings.push({
            radius: ringParams.smallestRadius + i * ringParams.ringSpacing,
            speedMult: i + 1,
            angle: 0,
            hue: map(i, 0, ringParams.numRings - 1, 0, 360)  // Rainbow across rings
        });
    }

    frameRate(60);
}

window.draw = function () {
    if (!role) {
        noLoop()
        ringParams.speedDecay = 0.03;
        return;
    }

    if (role === 'pinwheel') {
        pinwheel();
    } else if (role === 'time') {
        timeRole();
    }

    if (inIntro && millis() > introDuration) {
        introTime = millis();
        inIntro = false;
    }
}

window.mousePressed = function () {
    Tone.start();
}

// window.windowResized = function () {
//     resizeCanvas(windowWidth, windowHeight);
// }
