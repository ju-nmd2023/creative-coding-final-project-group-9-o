import { musicians, assignRole } from '../stage.js';
import { DroneSynth, MonoSynth } from '../synth.js';

let inIntro = false;
let shouldBegin = false;

const hill_params = new Array(4);
const layers = {};
const roles = new Map([
    ["pinwheel", null],
    ["time", null],
]);
const musicianRoles = new Map();

// Chord progression and general sound inspiration from Berrynote:
// https://www.youtube.com/watch?v=yBZupwGLspQ
// transcription by zhaoxiongang on Musescore:
// https://musescore.com/user/38691124/scores/22662850
const chords = [
    [[0, -12], 0], // A
    [[0, -5, -12], 0],
    [[4, -5, -12], 0],
    [[-4, 5, -12], 1], // Dm / A
    [[-4, 5, 14, -12], 2], // Dm6/A
    [[4, -5, 12, -12], 0], // A
    [[0, 4, 11, -6], 3], // Ebsus4
    [[1, 3, 12, -6], 3], // ?? 
    [[9, 0, 7, -7], 4],  // D(add9)
    [[9, 0, 7, -7, 19], 4], // C#m7(add#5)
    [[7, 0, 2, 11, -8], 5],
    [[7, 0, 2, 19, -8], 5],
    [[-1, 0, 5, 7, -15], 6], // F#m9
    [[-1, 0, 4, 7, -17], 6],
    [[5, 2, 7, 12, -17], 7], // E7sus4
    [[13, 4, 9, 1, -18, -6], 8], // Ebm7
    [[14, 4, 9, 1, -18, -6], 8],
    [[16, 12, 5, 7, 0, -19], 9], // Dm9
    [[19, 14, 12, 7, 0, -20], 9],
    [[19, 12, 5, 7, 0, 28, -19], 9],
    [[7, 0, 2, 11, -8], 5], // C#m7
    [[6, -1, 1, 10, -9], 10], // Cm7
    [[0, 2, 7, 9, -10], 11], // Bm7sus4
    [[0, 2, 5, 9, -10], 11], // Bm7
    [[0, 2, 5, 11, -5], 12],
    [[0, 2, 7, 12, -12], 0],
    [[0, 4, 7, 12, -12], 0],
    [[0, 4, -12], 0],
    [[0, -12], 0],
];

// Arpeggios for each chord (standard voicing, lowest to highest)
const arpeggios = [
    [0, 4, 7], // A: A, C#, E
    [0, 2, 5], // Dm/A: A (bass), D, F
    [0, 2, 5, 9], // Dm6/A: A (bass), D, F, B
    [0, 3, 6], // Ebsus4: Eb, Ab, Bb, Db
    [0, 5, 9, 14], // D(add9): D, E, A, B
    [0, 2, 7, 11], // Cmaj7add9: C, D, G, B
    [-3, 0, 4, 7],
    [0, 2, 7, 5],
    [-4, 1, 4, 6],
    [-3, 0, 5, 7],
    [-1, 3, 6, 10],
    [0, 2, 5, 9],
    [0, 2, 5, 11],
];

// Each value is an index: floor(i / arpeggio.length) = octave, i % arpeggio.length = note within chord
const arpeggioSequence = [0, 1, 2, 3, 2, 4, 3, 5, 4, 3, 4, 5, 7, 6, 8, 7, 9, 8, 10, 9, 11, 12];

let chordIndex = 0;
let arpeggioSequenceIndex = 0;

// Stateful time value
let timeValue = 0.869;

// time when intro is done
let introTime = 0;
// time when user starts the animation by clicking
// needed to start audio
let startTime = 0;

function getRoleValue(role) {
    if (role === 'pinwheel') {
        const data = musicians.get(roles.get(role));
        if (data) return data;
    } else if (role === 'time') {
        const data = musicians.get(roles.get(role));
        if (data && data.rotationRate) {
            // Integrate rotation rate beta (deg/s) to update time
            const dt = deltaTime / 1000;

            // Scale rotation rate to time change (adjust multiplier to taste)
            const timeSpeed = data.rotationRate.beta / 360; // 360 deg/s = 1 full day/s
            timeValue += timeSpeed * dt;

            // Wrap around [0, 1]
            timeValue = timeValue % 1;
            if (timeValue < 0) timeValue += 1;

            return timeValue;
        } else {
            // Fallback: start at intro time (0.869) and auto-animate slowly
            // return 0.869;
            return (0.869 + (millis() - introTime) / 70000) % 1;
        }
    }
}

window.addEventListener('musician', (e) => {
    console.log(e.detail);
    if (e.detail.type === 'join') {
        for (let [role, musician] of roles) {
            if (musician === null) {
                roles.set(role, e.detail.id);
                musicianRoles.set(e.detail.id, role);
                console.log(`new musician, assigned role ${role}`);
                // Send role assignment to the musician
                assignRole(e.detail.id, role);
                break;
            }
        }
    } else if (e.detail.type === 'disconnect') {
        const role = musicianRoles.get(e.detail.id);
        console.log(`musician quit, role ${role} clear`);
        musicianRoles.delete(e.detail.id);
        roles.set(role, null);
    };
});

class World {
    constructor() {
        this.t = 0;
        this.sunX = 0;
        this.sunY = 0;
        this.moonX = 0;
        this.moonY = 0;
        this.sunElevation = 0;
        this.angle = 0;
        this.lastPress = 0;

        this.pinwheelState = {
            spin: 0,
            spinSpeed: 3,
            decayFactor: pinwheelDecayRate,
            offset: createVector(0, 0),
            lastNoteRadians: 0,  // Track when we last triggered a note
            noteInterval: PI/2,   // Trigger a note every 0.5 radians (~28.6 degrees)
            lastNoteTime: 0,      // Track when we last triggered a note (in milliseconds)
            minNoteInterval: 70, // Minimum time between notes (ms) - prevents notes from being too rapid
        };

        this.stickState = {
            angle: PI/2,        // Current angle from vertical
            aVel: 0,            // Angular velocity
        };

        this.pinwheelStick = {
            length: 175,
            stiffness: 400.0,     // Spring stiffness (how rigid the stick is)
            damping: 0.9999,      // Damping coefficient (air resistance)
            mass: 0.6,          // Mass of pinwheel at top
            maxAngle: PI / 4,   // Maximum angle deviation from vertical (45 degrees)
            accelThreshold: 0.5,  // Minimum acceleration magnitude to register (m/s²)
            accelCap: 2.0,        // Maximum acceleration magnitude to process (m/s²)
        };

        // Sky colors
        this.skyColors = {
            night: color(10, 15, 40),
            twilight: color(100, 60, 100),
            sunrise: color(255, 140, 100),
            day: color(135, 206, 235),
        };

        // Sky transition thresholds
        this.skyStages = {
            night: -1,
            twilight: -0.2,
            sunrise: 0.5,
        };

        // Generate random star positions
        this.stars = [];
        for (let i = 0; i < 150; i++) {
            this.stars.push({
                x: random(width),
                y: random(height * 0.7), // Keep stars in upper portion of sky
                size: random(1, 3),
            });
        }
    }

    update(t) {
        this.t = t;
        this.angle = t * TWO_PI - HALF_PI; // Start at bottom
        let centerX = width / 2;
        let centerY = height * 1.08;
        let radius = height * 0.97;

        this.sunX = centerX + cos(this.angle) * radius;
        this.sunY = centerY + sin(this.angle) * radius;
        this.sunElevation = map(this.sunY, height * 0.64, centerY - radius, -1, 1);

        let moonAngle = this.angle + PI;
        this.moonX = centerX + cos(moonAngle) * radius;
        this.moonY = centerY + sin(moonAngle) * radius;

        // Update pinwheel blade spin
        const spinDelta = this.pinwheelState.spinSpeed * (deltaTime / 1000) * 360;
        this.pinwheelState.spin += spinDelta;
        this.pinwheelState.spin %= 360;

        const spinDeltaRadians = radians(spinDelta);

        // Check if we've crossed a note interval threshold
        // Only trigger notes when pinwheel is actually spinning (speed > threshold)
        if (this.pinwheelState.spinSpeed && monoSynth) {
            const radiansSpun = (this.pinwheelState.lastNoteRadians + spinDeltaRadians);
            const currentTime = millis();
            const timeSinceLastNote = currentTime - this.pinwheelState.lastNoteTime;

            // Check if we've spun enough to trigger a new note AND enough time has passed
            if (radiansSpun >= this.pinwheelState.noteInterval &&
                timeSinceLastNote >= this.pinwheelState.minNoteInterval) {
                // Reset the counter
                this.pinwheelState.lastNoteRadians = 0;
                this.pinwheelState.lastNoteTime = currentTime;

                // TODO: Select note based on current chord
                // For now, this is a placeholder - you'll decide the logic
                const noteOffset = this.selectPinwheelNote();

                // Trigger the note (shorter duration as they'll be rapid)
                monoSynth.trigger(noteOffset, 0.15);
            } else {
                this.pinwheelState.lastNoteRadians += spinDeltaRadians;
            }
        }

        this.pinwheelState.spinSpeed *= Math.pow(this.pinwheelState.decayFactor, deltaTime);

        if (this.pinwheelState.spinSpeed < 0.1) {
            this.pinwheelState.spinSpeed = 0;
            // Reset arpeggio sequence when pinwheel stops
            arpeggioSequenceIndex = 0;
        }

        const pinwheelData = getRoleValue('pinwheel');
        if (pinwheelData?.acceleration) {
            // Cap deltaTime to prevent physics explosion on lag frames
            const dt = min(deltaTime / 1000, 0.06); // Max 100ms per frame

            // Normalize acceleration data: threshold and cap
            let accelX = pinwheelData.acceleration.x;

            // Apply deadzone threshold
            if (abs(accelX) < this.pinwheelStick.accelThreshold) {
                accelX = 0;
            } else {
                // Remove threshold offset to make movement smooth at threshold boundary
                accelX = accelX - Math.sign(accelX) * this.pinwheelStick.accelThreshold;
            }

            // Cap maximum acceleration
            accelX = constrain(accelX, -this.pinwheelStick.accelCap, this.pinwheelStick.accelCap);

            // Target angle from accelerometer (external force)
            const targetAngle = PI/2 + atan2(accelX * 0.1, 9.8);

            // Spring force: tries to return to vertical (PI/2) but influenced by accelerometer
            const restAngle = PI/2;
            const springForce = -this.pinwheelStick.stiffness * (this.stickState.angle - targetAngle);

            // Gravity effect on top-heavy stick (torque from weight)
            const gravityTorque = -0.5 * sin(this.stickState.angle - restAngle);

            // Damping force (opposes velocity)
            const dampingForce = -this.pinwheelStick.damping * this.stickState.aVel;

            // Total angular acceleration = (forces) / mass
            const aAcc = (springForce + gravityTorque + dampingForce) / this.pinwheelStick.mass;

            // Update velocity and angle
            this.stickState.aVel += aAcc * dt;
            this.stickState.angle += this.stickState.aVel * dt;

            // Apply diminishing returns for extreme angles
            // Use a soft constraint that gets progressively harder to exceed
            const angleDeviation = this.stickState.angle - restAngle;
            const normalizedDev = angleDeviation / this.pinwheelStick.maxAngle;

            // Apply damping factor that increases exponentially as we approach/exceed max angle
            // This creates smooth diminishing returns instead of hard clamping
            if (abs(normalizedDev) > 0.6) {
                // Beyond max angle: apply very aggressive exponential damping
                const excess = abs(normalizedDev) - 1.0;
                const dampingFactor = 1.0 / (1.0 + pow(excess, 3) * 4); // Cubic falloff, very aggressive
                this.stickState.angle = restAngle + angleDeviation * dampingFactor;
                // Strongly dampen velocity to prevent oscillation
                this.stickState.aVel *= dampingFactor * 0.5;
            } 

            // Calculate position offset
            this.pinwheelState.offset.x = this.pinwheelStick.length * sin(this.stickState.angle - PI/2);
            this.pinwheelState.offset.y = this.pinwheelStick.length * (1 - cos(this.stickState.angle - PI/2));

            const level = pinwheelData.blowingStrength;
            this.pinwheelState.spinSpeed += level * 0.04;
            this.pinwheelState.spinSpeed = Math.min(this.pinwheelState.spinSpeed, 6);
        }
    }

    sky() {
        let { top: topColor, bottom: bottomColor } = this.getSkyColors();

        for (let y = 0; y < height; y++) {
            let amt = map(y, 0, height, 0, 1);
            layers.sky.stroke(lerpColor(topColor, bottomColor, amt));
            layers.sky.line(0, y, width, y);
        }
    }

    daylight() {
        this.sky();

        layers.skyObjects.clear();

        // Draw stars during nighttime
        // Calculate star visibility based on sun elevation
        let starAlpha = 0;
        if (this.sunElevation < this.skyStages.night) {
            // Full night - stars at full brightness
            starAlpha = 255;
        } else if (this.sunElevation < this.skyStages.sunrise) {
            // Twilight through sunrise - stars fade out
            starAlpha = map(this.sunElevation, this.skyStages.night, this.skyStages.sunrise, 255, 0);
        }

        if (starAlpha > 0) {
            layers.skyObjects.noStroke();
            for (let star of this.stars) {
                // Use Perlin noise to vary star intensity based on time
                let noiseVal = noise(star.x + this.t * 20, star.y + this.t * 3);

                let alpha = map(noiseVal, 0, 1, 20, 255) * (starAlpha / 255);
                layers.skyObjects.fill(255, 255, 255, alpha);
                layers.skyObjects.circle(star.x, star.y, star.size);
            }
        }

        if (this.sunY < height) {
            layers.skyObjects.noStroke();
            layers.skyObjects.fill(255, 220, 0);
            layers.skyObjects.circle(this.sunX, this.sunY, 60);
        }

        // Draw moon when it's nighttime (above horizon)
        if (this.moonY < height) {
            layers.skyObjects.noStroke();
            layers.skyObjects.fill(240, 240, 255);
            layers.skyObjects.circle(this.moonX, this.moonY, 50);
            // Add some craters
            layers.skyObjects.fill(220, 220, 235);
            layers.skyObjects.circle(this.moonX - 10, this.moonY - 5, 12);
            layers.skyObjects.circle(this.moonX + 8, this.moonY + 8, 8);
        }
    }

    /**
     * Select a note for the pinwheel to play
     * This will be based on the current chord playing in the drone synth
     * @returns {number} semitone offset from base note
     */
    selectPinwheelNote() {
        if (chordIndex >= chords.length) {
            return 0; // Default fallback: play the root note
        }

        const arpeggioIndex = chords[chordIndex][1];
        const currentArpeggio = arpeggios[arpeggioIndex];

        // Get the current position in the sequence
        const sequenceValue = arpeggioSequence[arpeggioSequenceIndex];

        // Calculate octave and note within the chord
        const octave = Math.floor(sequenceValue / currentArpeggio.length);
        const noteIndex = sequenceValue % currentArpeggio.length;

        // Get the base note from the arpeggio and add octave offset
        const noteOffset = currentArpeggio[noteIndex] + (octave * 12);

        // Advance to next position in sequence (wrap around)
        arpeggioSequenceIndex = (arpeggioSequenceIndex + 1) % arpeggioSequence.length;

        return noteOffset;
    }

    getSkyColors() {
        // Night
        if (this.sunElevation < this.skyStages.night) {
            let t = map(this.sunElevation, -4, this.skyStages.night, 0, 1);
            return {
                top: lerpColor(this.skyColors.night, color(2, 0, 10), t),
                bottom: this.skyColors.night,
                ambient: lerpColor(color(30, 40, 80), color(20, 25, 50), t),
            };
        }

        // Dawn/dusk twilight
        if (this.sunElevation < this.skyStages.twilight) {
            let t = map(this.sunElevation, this.skyStages.night, this.skyStages.twilight, 0, 1);
            return {
                top: lerpColor(this.skyColors.night, this.skyColors.twilight, t),
                bottom: lerpColor(this.skyColors.night, this.skyColors.sunrise, t),
                ambient: lerpColor(color(30, 40, 80), color(200, 140, 120), t),
            };
        }

        // Sunrise/sunset
        if (this.sunElevation < this.skyStages.sunrise) {
            let t = map(this.sunElevation, this.skyStages.twilight, this.skyStages.sunrise, 0, 1);
            return {
                top: lerpColor(this.skyColors.twilight, this.skyColors.day, t),
                bottom: lerpColor(this.skyColors.sunrise, this.skyColors.day, t),
                ambient: lerpColor(color(200, 140, 120), color(255, 250, 240), t),
            };
        }

        // Full day
        return {
            top: this.skyColors.day,
            bottom: color(180, 220, 255),
            ambient: color(255, 250, 240),
        };
    }

    getRimLightColor() {
        // During sunrise/sunset, use warm colors
        if (this.sunElevation > -0.5 && this.sunElevation < 0.5) {
            // Sunrise/sunset - warm orange/red rim light
            let intensity = map(abs(this.sunElevation), 0, 0.5, 255, 50);
            return color(255, 150, 80, intensity);
        } else if (this.sunY < height) {
            // Daytime - subtle warm highlight
            return color(255, 255, 200, 100);
        } else if (this.moonY < height) {
            // Nighttime - cool moonlight
            return color(200, 220, 255, 120);
        }
        return null;
    }

    hills(layer = layers.hills, lightingLayer = layers.accents, erase = false) {
        layer.fill(20, 200, 50);
        layer.noStroke();

        for (let i = 0; i < 4; i++) {
            const points = Math.floor(width / 80);
            let phase, amp, freq;
            [phase, amp, freq] = hill_params[i];
            const hill = (x) => {
                let angle = map(x, 0, points, 0, TWO_PI);
                return sin(phase + angle * freq) * amp;
            };

            const hillPoint = (x) => [
                map(x, 0, points, 0, width),
                map(hill(x), -1, 1, height/4, height - height/4)
            ];

            if (erase) layer.erase();
            layer.beginShape();
            for (let x = 0; x <= points; x++) {
                layer.vertex(...hillPoint(x));

                if (erase || x >= points) continue;

                // Calculate rim light color with symmetric transitions
                let rimColor = color(0); // Default black stroke

                if (this.sunElevation >= this.skyStages.sunrise) {
                    rimColor = color(0);
                } else if (this.sunElevation >= this.skyStages.twilight) {
                    let t = map(this.sunElevation, this.skyStages.twilight, this.skyStages.sunrise, 0, 1);
                    rimColor = lerpColor(color(255, 220, 80), color(0), t);
                } else if (this.sunElevation >= this.skyStages.night) {
                    let t = map(this.sunElevation, this.skyStages.night, this.skyStages.twilight, 0, 1);
                    rimColor = lerpColor(color(0), color(255, 220, 80), t);
                } else {
                    let t = map(this.sunElevation, this.skyStages.night-3, -8, 0, 1, true);
                    rimColor = lerpColor(color(0), color(240, 240, 255), t);
                }

                // Draw rim light segment
                if (lightingLayer) {
                    let [x1, y1] = hillPoint(x);
                    let [x2, y2] = hillPoint(x + 1);

                    lightingLayer.push();
                    lightingLayer.strokeWeight(3);
                    lightingLayer.stroke(rimColor);
                    lightingLayer.line(x1, y1, x2, y2);
                    lightingLayer.pop();
                }
            }
            layer.vertex(width, height);
            layer.vertex(0, height);
            layer.endShape(CLOSE);
            if (erase) layer.noErase();

            // After drawing each hill, erase its shape from the lighting layer
            // so subsequent hills can occlude it
            if (lightingLayer && !erase) {
                lightingLayer.beginShape();
                for (let x = 0; x <= points; x++) {
                    lightingLayer.vertex(...hillPoint(x));
                }
                lightingLayer.vertex(width, height);
                lightingLayer.vertex(0, height);
                lightingLayer.erase();
                lightingLayer.endShape(CLOSE);
                lightingLayer.noErase();
            }
        }
    }

    pinwheel(origin, angle = 0, layer = layers.pinwheel) {
        // Get ambient light color for realistic lighting
        let lightColor = this.getSkyColors().ambient;

        // Helper to multiply color with light (simulates realistic lighting)
        const applyLighting = (baseColor) => {
            let r = red(baseColor) * red(lightColor) / 255;
            let g = green(baseColor) * green(lightColor) / 255;
            let b = blue(baseColor) * blue(lightColor) / 255;
            return color(r, g, b);
        };

        layer.clear();
        layer.push();
        layer.translate(origin);
        layer.rotate(angle);

        // Calculate second control point - takes most of the bend near the top
        const bendAmount = (this.stickState.angle - PI/2);
        const ctrl2X = this.pinwheelState.offset.x * 0.7 - bendAmount * this.pinwheelStick.length * 0.15;
        const ctrl2Y = this.pinwheelStick.length * 0.3;

        layer.scale(1.2);
        layer.noFill();
        layer.stroke(applyLighting(color(101, 67, 33)));
        layer.strokeWeight(6);
        layer.bezier(
            0, this.pinwheelStick.length,
            0, this.pinwheelStick.length * 0.7,
            ctrl2X, ctrl2Y,
            this.pinwheelState.offset.x, this.pinwheelState.offset.y
        );
        layer.translate(this.pinwheelState.offset);
        layer.angleMode(RADIANS);
        layer.rotate(this.stickState.angle);
        layer.angleMode(DEGREES);
        layer.rotate(this.pinwheelState.spin);
        layer.noStroke();
        for (let i = 0; i < 4; i++) {
            layer.fill(applyLighting(i % 2 ? color('#1CE3CD') : color('#E31C32')));
            layer.beginShape();
            layer.vertex(0, 80);
            layer.vertex(25, 50);
            layer.vertex(25, 0);
            layer.vertex(0, 0);
            layer.endShape(CLOSE);
            layer.fill(applyLighting(i % 2 ? color('#16B3A1') : color('#B31627')));
            layer.beginShape();
            layer.vertex(25, 50);
            layer.vertex(25, 0);
            layer.vertex(0, 0);
            layer.endShape(CLOSE);
            layer.rotate(90);
        }
        layer.fill(applyLighting(color(210)));
        layer.circle(0, 0, 15);
        layer.pop();
    }

    render() {
        this.daylight();
        this.hills();
        this.pinwheel(createVector(width*0.60, height*0.62), 9);
    }
}

let world;
let synth;
let monoSynth;

export function getSound() {
    return synth;
}

export function setup() {
    for (let i = 0; i < 4; i++) {
        hill_params[i] = [
            random(0, TWO_PI),
            random(0.2, 0.4),
            random(0.2, 1),
        ];
    }
    layers.hills = createGraphics(width, height);
    layers.sky = createGraphics(width, height);
    layers.skyObjects = createGraphics(width, height);
    layers.accents = createGraphics(width, height);
    layers.lighting = createGraphics(width, height);
    layers.pinwheel = createGraphics(width, height);
    world = new World();

    // Initialize synth (needs user interaction to start audio context)
    synth = new DroneSynth({
        baseNote: 210,
        waveform: 0.0,
        numHarmonics: 1,
        filterFrequency: 1000,
        filterResonance: 5
    });

    // Initialize monophonic synth for pinwheel notes
    monoSynth = new MonoSynth({
        baseNote: 420,        // Match drone synth base note
        oscillator: { type: 'sine' },
        envelope: {
            attack: 0.005,    // Super quick attack (5ms)
            decay: 0.05,      // Quick decay (50ms)
            sustain: 0.1,     // Low sustain level
            release: 0.1     // Very short release (80ms)
        },
        volume: -18,          // Quieter to not overpower the drone
        reverbAmount: 0.4     // Nice ambient tail
    });

    world.update(0.869); // initial state for intro
    world.render();

    layers.intro = createGraphics(width, height);
    background(0);
}


// Track last time we updated sound parameters
let lastSoundUpdate = 0;
const soundUpdateInterval = 100;

// Intro timing configuration - just durations and delays
const introTimings = [
    { duration: 1000, delay: 1000 },  // Sky fade in
    { duration: 1000, delay: 1000 },  // Hill outlines
    { duration: 1000, delay: 1000 },  // Hill color
    { duration: 2000, delay: 500 },   // Stars
    { duration: 2000, delay: 0 },     // Pinwheel
];

const pinwheelDecayRate = 0.9987;

// Event queue for one-time sound/animation triggers
const eventQueue = [];

/**
 * Calculate cumulative time offset for a given stage
 * @param {number} stage - The intro stage number (0-4)
 * @returns {number} Cumulative time in milliseconds
 */
function getStageOffset(stage) {
    let cumulative = 0;
    for (let i = 0; i < stage; i++) {
        cumulative += introTimings[i].duration + introTimings[i].delay;
    }
    return cumulative;
}

/**
 * Schedule an event to fire at a specific time
 * @param {number} time - Time offset in milliseconds (relative to stage if stage is provided)
 * @param {function} callback - Function to call when event fires
 * @param {number} [stage] - Optional stage number (0-4) to offset time by
 */
function scheduleEvent(time, callback, stage) {
    const absoluteTime = stage !== undefined ? getStageOffset(stage) + time : time;
    eventQueue.push({ time: absoluteTime, callback, fired: false });
}

function processEvents(currentTime) {
    for (let event of eventQueue) {
        if (!event.fired && currentTime >= event.time) {
            event.callback();
            event.fired = true;
        }
    }
    // Clean up fired events periodically
    while (eventQueue.length > 0 && eventQueue[0].fired) {
        eventQueue.shift();
    }
}

function scheduleIntroEvents() {
    // Clear any existing events
    eventQueue.length = 0;

    // Stage 0: Sky fade - play [0] and increase harmonics
    scheduleEvent(0, () => {
        synth.playChord([0]);
    }, 0);

    scheduleEvent(0, () => {
        synth.setHarmonics(2);
    }, 1);

    scheduleEvent(0, () => {
        synth.setHarmonics(5);
    }, 2);

    scheduleEvent(0, () => {
        synth.playChord([-5, 0]);
        for (let i = 0; i < 20; i++) {
            setTimeout(() => {
                synth.setHarmonics(5 + i);
            }, (5000 / 20) * i + 200);
        }
    }, 3);
}

export function mousePressed() {
    if (!shouldBegin) {
        Tone.start();
        shouldBegin = true;
        startTime = millis();

        if (inIntro) {
            scheduleIntroEvents();
        } else {
            // Skip intro - initialize synth immediately
            synth.setHarmonics(25);
            synth.playChord(chords[chordIndex][0]);
        }
        return;
    }

    if (!inIntro) {
        chordIndex++;
        if (chordIndex < chords.length) {
            synth.playChord(chords[chordIndex][0]);
        } else {
            synth.stopAll();
        }
    }
}

function intro() {
    const t = millis() - startTime;

    // Process event queue for one-time sound triggers
    processEvents(t);

    image(layers.sky, 0, 0);

    let cumulative = 0;

    // Stage 0: Sky fade
    if (t < cumulative + introTimings[0].duration) {
        fill(0, map(t, cumulative, cumulative + introTimings[0].duration, 255, 0));
        rect(0, 0, width, height);
        return;
    }
    cumulative += introTimings[0].duration + introTimings[0].delay;

    // Stage 1: Hill outlines
    if (t < cumulative + introTimings[1].duration + introTimings[1].delay) {
        layers.intro.clear();
        layers.intro.image(layers.accents, 0, 0);
        if (t < cumulative + introTimings[1].duration) {
            const sweep = map(t, cumulative, cumulative + introTimings[1].duration, width, 0);
            layers.intro.erase();
            layers.intro.rect(0, 0, sweep, height);
            layers.intro.noErase();
        }
        image(layers.intro, 0, 0);
        return;
    }
    cumulative += introTimings[1].duration + introTimings[1].delay;

    // Stage 2: Hill color
    if (t < cumulative + introTimings[2].duration + introTimings[2].delay) {
        image(layers.accents, 0, 0);
        layers.intro.clear();
        layers.intro.image(layers.hills, 0, 0);
        if (t < cumulative + introTimings[2].duration) {
            const sweep = map(t, cumulative, cumulative + introTimings[2].duration, width, 0);
            layers.intro.erase();
            layers.intro.rect(0, 0, sweep, height);
            layers.intro.noErase();
        }
        blendMode(MULTIPLY);
        image(layers.intro, 0, 0);
        blendMode(BLEND);
        return;
    }
    cumulative += introTimings[2].duration + introTimings[2].delay;

    // Stage 3: Stars
    if (t < cumulative + introTimings[3].duration + introTimings[3].delay) {
        // Draw stars progressively
        const starsT = t < cumulative + introTimings[3].duration ?
            map(t, cumulative, cumulative + introTimings[3].duration, 0, 1) : 1;
        const numStars = floor(starsT * world.stars.length);

        layers.intro.clear();
        layers.intro.noStroke();
        for (let i = 0; i < numStars; i++) {
            const star = world.stars[i];
            const brightness = Math.ceil(noise(star.x, star.y) * 255);
            layers.intro.fill(255, 255, 255, brightness);
            layers.intro.circle(star.x, star.y, star.size);
        }

        world.hills(layers.intro, null, true);
        image(layers.intro, 0, 0);
        image(layers.accents, 0, 0);
        blendMode(MULTIPLY);
        image(layers.hills, 0, 0);
        blendMode(BLEND);
        return;
    }
    cumulative += introTimings[3].duration + introTimings[3].delay;

    // Stage 4: Pinwheel
    if (t < cumulative + introTimings[4].duration + introTimings[4].delay) {
        // Set pinwheel to no decay during intro
        if (t < cumulative + 50) { // Reset in first frame
            world.pinwheelState.decayFactor = 1.0;
        }

        // Update world to spin the pinwheel
        world.update(world.t);

        // Render pinwheel
        world.pinwheel(createVector(width*0.60, height*0.62), 9);

        // Draw stars
        layers.intro.clear();
        layers.intro.noStroke();
        for (let i = 0; i < world.stars.length; i++) {
            const star = world.stars[i];
            const brightness = Math.ceil(noise(star.x, star.y) * 255);
            layers.intro.fill(255, 255, 255, brightness);
            layers.intro.circle(star.x, star.y, star.size);
        }
        world.hills(layers.intro, null, true);
        image(layers.intro, 0, 0);
        image(layers.accents, 0, 0);
        blendMode(MULTIPLY);
        image(layers.hills, 0, 0);
        blendMode(BLEND);

        // Fade in pinwheel
        layers.intro.clear();
        layers.intro.image(layers.pinwheel, 0, 0);
        if (t < cumulative + introTimings[4].duration) {
            const fadeT = map(t, cumulative, cumulative + introTimings[4].duration, 0, 1);
            const eraseAlpha = map(fadeT, 0, 1, 255, 0);
            layers.intro.erase(eraseAlpha, eraseAlpha);
            layers.intro.rect(0, 0, width, height);
            layers.intro.noErase();
        }
        image(layers.intro, 0, 0);
        return;
    }

    // Intro complete - reset decay rate
    world.pinwheelState.decayFactor = pinwheelDecayRate;
    introTime = millis();
    inIntro = false;
    updateSoundForTimeOfDay(1000);
}

/**
 * Update synth parameters based on time of day
 * Uses world.t (0-1 represents full day/night cycle)
 * Parameters transition smoothly using Tone.js ramping
 *
 * Time mapping:
 * - t=0.0: midnight (sun at bottom)
 * - t=0.25: sunrise
 * - t=0.5: noon (sun at top)
 * - t=0.75: sunset
 * - t=1.0: midnight again
 * - intro starts at t=0.869 (late night, just before midnight)
 */
function updateSoundForTimeOfDay(rampTime = soundUpdateInterval / 1000) {
    const now = millis();
    if (now - lastSoundUpdate < soundUpdateInterval) return;
    lastSoundUpdate = now;

    const t = world.t;

    // Convert t to a day phase where 0=night, 0.5=day, back to 1=night
    // Use cosine to map the circular time to day/night intensity
    const dayPhase = (cos(t * TWO_PI) + 1) / 2; // 0 at midnight, 1 at noon

    // Calculate how close we are to twilight (sunrise/sunset at t=0.25 and t=0.75)
    // Distance from nearest twilight point
    const twilightDist1 = abs(t - 0.25);
    const twilightDist2 = abs(t - 0.75);
    const twilightProximity = 1 - min(twilightDist1, twilightDist2) * 4; // 1 at twilight, 0 elsewhere
    const isTwilight = max(0, twilightProximity);

    const filterFreq = map(dayPhase, 0, 1, 400, 1800);
    synth.filter.frequency.rampTo(filterFreq, rampTime);

    const filterQ = map(isTwilight, 0, 1, 3, 7);
    synth.filter.Q.rampTo(filterQ, rampTime);

    const waveform = map(dayPhase, 0, 1, 0.1, 0.5);
    synth.setWaveform(waveform);

    // Volume: slightly louder during twilight hours for emphasis
    const baseVolume = 0.3;
    const twilightBoost = map(isTwilight, 0, 1, 1.0, 1.12);
    const volume = baseVolume * twilightBoost;
    synth.masterGain.gain.rampTo(volume, rampTime);
}

export function draw() {
    if (!shouldBegin) return;
    if (inIntro) {
        intro();
        return;
    }

    // Get time from musician's phone orientation (or fallback to auto-animate)
    let t = getRoleValue('time');
    world.update(t);
    world.render();

    // Update sound parameters based on time of day
    updateSoundForTimeOfDay();

    world.hills(layers.skyObjects, null, true);

    // Render layers in proper order
    image(layers.sky, 0, 0);
    image(layers.skyObjects, 0, 0);

    // Darken hills with multiply
    blendMode(MULTIPLY);
    image(layers.hills, 0, 0);
    blendMode(BLEND);

    // Accent highlights (rim lights)
    image(layers.accents, 0, 0);

    // Pinwheel (lighting applied during rendering)
    image(layers.pinwheel, 0, 0);

    // noLoop(); // Comment out to see animation, or uncomment for static
}
