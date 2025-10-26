import { DroneSynth } from '../synth.js';

// Timing and animation parameters
let startTime;
const cubeFadeInDuration = 2000; // 2 seconds for cube fade in
const cubeSize = 150;
const cubeRotationSpeed = { x: 0.0005, y: 0.0008, z: 0.0003 }; // Different speeds for each axis (slower)

// Ring configuration for armillary sphere
const ringParams = {
    numRings: 8,
    dotsPerRing: 12,
    dotSize: 8,
    smallestRadius: 180,
    ringSpacing: 40,
    baseDotRotationSpeed: 0.01, // Base speed for innermost ring
    dotRotationSpeedMultiplier: 1.3, // Each ring spins this much faster than the previous
};

// Time between each ring fading in
const ringFadeDelay = 300; // 300ms between each ring
const ringFadeDuration = 1000; // 1 second for each ring to fade in

// Chord progression for trailer
// Chords: [semitone offsets from base A]
const chords = [
    [0],           // Chord 0: A (single note)
    [0, -12],      // Chord 1: A in two octaves
    [0, -5, 4, -12],    // Chord 2: A major (A, C#, E)
    [0, 4, -5, -12, 11], 
];

// Timing for chord changes and animation phases
const chordTimings = {
    chord0Start: 0,                              // Cube fade in begins
    chord1Start: cubeFadeInDuration,             // Rings start fading in (stationary)
    chord2Start: cubeFadeInDuration + (ringParams.numRings * ringFadeDelay) + ringFadeDuration, // Dots start moving
    chord3Start: cubeFadeInDuration + (ringParams.numRings * ringFadeDelay) + ringFadeDuration + 3000, // Rings start rotating (3s after dots)
};

const dotEaseDuration = 2000; // 2 seconds for dots to ease into full speed
const ringRotationEaseDuration = 2000; // 2 seconds for rings to ease into rotation

// Audio
let synth;
let currentChordIndex = -1;

// Activation state
let isActivated = false;

// Generate ring configurations with different rotation axes
const rings = [];

window.setup = function() {
    createCanvas(innerWidth, innerHeight, WEBGL);
    background(10, 15, 40);

    // Create rings with different rotation axes (like an armillary sphere)
    for (let i = 0; i < ringParams.numRings; i++) {
        // Create varied rotation axes for armillary sphere effect
        // Each ring rotates around a different axis in 3D space
        const angle1 = (i / ringParams.numRings) * PI;
        const angle2 = (i / ringParams.numRings) * TWO_PI;

        rings.push({
            radius: ringParams.smallestRadius + i * ringParams.ringSpacing,
            // Rotation axis for the ring itself (varied to create armillary effect)
            axisX: sin(angle1) * cos(angle2),
            axisY: cos(angle1),
            axisZ: sin(angle1) * sin(angle2),
            // Rotation amount for the ring (much slower)
            rotationSpeed: 0.01,
            rotation: 0,
            // Angle for dots rotating within the ring (faster for outer rings)
            dotAngle: 0,
            dotRotationSpeed: ringParams.baseDotRotationSpeed * Math.pow(ringParams.dotRotationSpeedMultiplier, i),
            // Color
            hue: map(i, 0, ringParams.numRings - 1, 0, 360),
            // Fade in timing
            fadeStartTime: cubeFadeInDuration + i * ringFadeDelay,
        });
    }

    // Handle activation button click
    const activateBtn = document.getElementById('activate-btn');
    activateBtn.addEventListener('click', async () => {
        // Start Tone.js audio context
        await Tone.start();

        // Initialize synth
        synth = new DroneSynth({
            baseNote: 208, // A3 (220 Hz)
            waveform: 0.3,
            numHarmonics: 20,
            filterFrequency: 2000,
            filterResonance: 3
        });
        window.synth = synth;

        // Set start time
        startTime = millis();
        isActivated = true;

        // Hide overlay
        document.getElementById('loading-overlay').classList.add('hidden');

        // Start rendering
        loop();
    });

    frameRate(60);
    noLoop(); // Don't start drawing until activated
}

window.draw = function() {
    if (!isActivated) {
        background(0);
        return;
    }

    const t = millis() - startTime;

    // Trigger chords based on timing
    let targetChordIndex = -1;
    if (t >= chordTimings.chord3Start) {
        targetChordIndex = 3;
    } else if (t >= chordTimings.chord2Start) {
        targetChordIndex = 2;
    } else if (t >= chordTimings.chord1Start) {
        targetChordIndex = 1;
    } else if (t >= chordTimings.chord0Start) {
        targetChordIndex = 0;
    }

    if (targetChordIndex !== currentChordIndex && targetChordIndex >= 0 && synth) {
        currentChordIndex = targetChordIndex;
        synth.playChord(chords[currentChordIndex]);
    }

    // Calculate animation multipliers based on phase
    // Dots: stationary until chord2, then ease in
    let dotSpeedMultiplier = 0;
    if (t >= chordTimings.chord2Start) {
        const timeSinceDotsStart = t - chordTimings.chord2Start;
        dotSpeedMultiplier = map(timeSinceDotsStart, 0, dotEaseDuration, 0, 1, true);
        // Ease-in-out curve
        dotSpeedMultiplier = dotSpeedMultiplier * dotSpeedMultiplier * (3 - 2 * dotSpeedMultiplier);
    }

    // Rings: stationary until chord3, then ease in
    let ringRotationMultiplier = 0;
    if (t >= chordTimings.chord3Start) {
        const timeSinceRingsStart = t - chordTimings.chord3Start;
        ringRotationMultiplier = map(timeSinceRingsStart, 0, ringRotationEaseDuration, 0, 1, true);
        // Ease-in-out curve
        ringRotationMultiplier = ringRotationMultiplier * ringRotationMultiplier * (3 - 2 * ringRotationMultiplier);
    }

    // Background
    background(0);

    // Calculate cube fade-in alpha
    const cubeAlpha = map(t, 0, cubeFadeInDuration, 0, 255, true);

    // Draw spinning cube at center
    push();

    // Multi-axis rotation for the cube
    rotateX(t * cubeRotationSpeed.x);
    rotateY(t * cubeRotationSpeed.y);
    rotateZ(t * cubeRotationSpeed.z);

    stroke(0);
    strokeWeight(3);
    fill(200, 50, 8, cubeAlpha);
    box(cubeSize);
    pop();

    // Draw armillary sphere rings
    colorMode(HSB, 360, 100, 100, 255);

    for (let ring of rings) {
        // Calculate ring fade-in alpha
        const ringTimeSinceFadeStart = t - ring.fadeStartTime;
        const ringAlpha = map(ringTimeSinceFadeStart, 0, ringFadeDuration, 0, 255, true);

        // Only draw if fade has started
        if (ringAlpha <= 0) continue;

        push();

        // Rotate the entire ring around its unique axis (armillary sphere effect)
        rotate(ring.rotation, [ring.axisX, ring.axisY, ring.axisZ]);

        // Draw dots around the ring
        const angleStep = TWO_PI / ringParams.dotsPerRing;

        for (let i = 0; i < ringParams.dotsPerRing; i++) {
            const angle = i * angleStep + ring.dotAngle;
            const x = cos(angle) * ring.radius;
            const y = sin(angle) * ring.radius;

            push();
            translate(x, y, 0);
            noStroke();
            fill(ring.hue, 80, 90, ringAlpha);
            sphere(ringParams.dotSize);
            pop();
        }

        pop();

        // Update ring rotation (armillary sphere rotation) - controlled by multiplier
        ring.rotation += ring.rotationSpeed * ringRotationMultiplier;

        // Update dot rotation within the ring - controlled by multiplier
        ring.dotAngle += ring.dotRotationSpeed * dotSpeedMultiplier;
    }

    colorMode(RGB, 255);
}

window.windowResized = function() {
    resizeCanvas(innerWidth, innerHeight);
}
