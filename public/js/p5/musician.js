import { initMusician, quaternionToAxisAngle, slerpQuaternions } from '../musician.js';

// Initialize musician system
const { start, stop, onStatusChange, onSensorUpdate, onRoleAssigned, setMicLevel } = initMusician();

let sensorState = null;
let role = null;
let startTime = null;
let introTime = null;

let mic;
let meter = new Tone.Meter();
let lastMicSample = 0;

let inIntro = true;
let introDuration = 3000;
const fadeInDuration = 1000; // 1 second fade in
const cubeSize = 150;

// For smooth interpolation
let currentQuaternion = null;
let targetQuaternion = null;
let lastSensorUpdate = 0;
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

    let blowing = 0;
    if (millis() > lastMicSample + 100) {
        const micLevel = Tone.dbToGain(meter.getValue());
        setMicLevel(micLevel);
        blowing = micLevel > 0.05 ? micLevel * 0.9 : 0;
        lastMicSample = millis();
    }
    ringSpeed = Math.max(0, ringSpeed - ringParams.speedDecay + blowing);
    ringSpeed = Math.min(ringSpeed, 5);
    ringShift = (ringShift + ringSpeed * (t/1000)) % TWO_PI;
}

window.setup = function() {
    createCanvas(windowWidth, windowHeight, WEBGL);
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
        mic = new Tone.UserMedia().connect(meter);
        await mic.open();
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

    }

    if (inIntro && millis() > introDuration) {
        introTime = millis();
        inIntro = false;
    }
}

window.windowResized = function () {
    resizeCanvas(windowWidth, windowHeight);
}
