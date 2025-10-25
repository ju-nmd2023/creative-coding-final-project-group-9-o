import { initMusician, quaternionToAxisAngle, slerpQuaternions } from '../musician.js';

// UI elements
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.querySelector('.loading-message');
const activationPrompt = document.querySelector('.activation-prompt');
const activateBtn = document.getElementById('activate-btn');

// Initialize musician system
const { start, stop, onStatusChange, onSensorUpdate, onReady } = initMusician(true); // use mic

let sensorState = null;
let startTime = null;
let introTime = null;
let isReady = false;
let isActivated = false;

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

// Day/night cycle state
let timeValue = 0; // 0 to 1, where 0 = midnight, 0.5 = noon

function getBackgroundColor(timeValue) {
    // Map time value to different phases of the day
    // 0 = midnight, 0.5 = noon

    const nightColor = color(10, 15, 40);
    const dayColor = color(135, 206, 235);

    // Use cosine wave for smooth day/night transition
    // cos(0) = 1 (noon), cos(PI) = -1 (midnight)
    const angle = timeValue * TWO_PI;
    const t = (cos(angle) + 1) / 2; // Map from [-1, 1] to [0, 1]

    return lerpColor(nightColor, dayColor, t);
}

function pinwheel() {
    const t = millis() - startTime;

    // Update time value based on beta rotation rate
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

    // Set background color based on time
    const bgColor = getBackgroundColor(timeValue);
    background(bgColor);

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
        loadingMessage.textContent = status;
    });

    // Handle sensor data updates
    onSensorUpdate((state) => {
        sensorState = state;
    });

    // When socket is ready, show activation prompt
    onReady(() => {
        console.log('Socket ready - waiting for user activation');
        isReady = true;

        // Hide loading spinner, show activation prompt
        document.querySelector('.loading-spinner').style.display = 'none';
        loadingMessage.style.display = 'none';
        activationPrompt.classList.add('visible');
    });

    // Handle activation button click
    activateBtn.addEventListener('click', async () => {
        console.log('Activating sensors and audio...');

        // Start Tone.js audio context (required for microphone)
        await Tone.start();

        // Start sensors
        const success = await start();

        if (success) {
            isActivated = true;
            startTime = millis();

            // Hide overlay
            loadingOverlay.classList.add('hidden');

            // Start rendering
            loop();
        } else {
            activationPrompt.querySelector('.prompt-text').textContent =
                'Failed to activate sensors. Please check permissions and try again.';
        }
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
    noLoop(); // Don't start drawing until activated
}

window.draw = function () {
    if (!startTime) {
        return;
    }

    pinwheel();

    if (inIntro && millis() - startTime > introDuration) {
        introTime = millis();
        inIntro = false;
    }
}

// window.windowResized = function () {
//     resizeCanvas(windowWidth, windowHeight);
// }
