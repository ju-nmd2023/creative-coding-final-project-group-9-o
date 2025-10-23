import { musicians } from '../conductor.js';
import { DroneSynth } from '../synth.js';

const hill_params = new Array(4);
const layers = {};
const roles = new Map([
    ["time", null],
    ["pinwheel", null],
]);
const musicianRoles = new Map();

// Stateful time value
let timeValue = 1;

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
            return (frameCount + 800) % 1000 / 1000;
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

        this.pinwheelState = {
            spin: 0,
            spinSpeed: 3,
            offset: createVector(0, 0),
        };

        this.stickState = {
            angle: PI/2,        // Current angle from vertical
            aVel: 0,            // Angular velocity
        };

        this.pinwheelStick = {
            length: 175,
            stiffness: 400.0,     // Spring stiffness (how rigid the stick is)
            damping: 0.999,      // Damping coefficient (air resistance)
            mass: 0.5,          // Mass of pinwheel at top
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
                noiseOffsetX: random(1000),
                noiseOffsetY: random(1000),
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
        this.pinwheelState.spin += this.pinwheelState.spinSpeed * (deltaTime / 1000) * 360;
        this.pinwheelState.spin %= 360;
        const decayFactor = 0.9987;

        this.pinwheelState.spinSpeed *= Math.pow(decayFactor, deltaTime);

        if (this.pinwheelState.spinSpeed < 0.1) {
            this.pinwheelState.spinSpeed = 0;
        }

        // Update pinwheel stick sway using accelerometer data
        const pinwheelData = getRoleValue('pinwheel');
        if (pinwheelData && pinwheelData.acceleration) {
            const dt = deltaTime / 1000;

            // Target angle from accelerometer (external force)
            const targetAngle = PI/2 + atan2(pinwheelData.acceleration.x * 0.1, 9.8);

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

            // Calculate position offset
            this.pinwheelState.offset.x = this.pinwheelStick.length * sin(this.stickState.angle - PI/2);
            this.pinwheelState.offset.y = this.pinwheelStick.length * (1 - cos(this.stickState.angle - PI/2));
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
        if (this.sunElevation < this.skyStages.twilight) {
            starAlpha = map(this.sunElevation, this.skyStages.twilight, this.skyStages.night, 0, 255);
        } else if (this.sunElevation < this.skyStages.night) {
            starAlpha = 255;
        }

        if (starAlpha > 0) {
            layers.skyObjects.noStroke();
            for (let star of this.stars) {
                // Use Perlin noise to vary star intensity based on time
                let noiseVal = noise(star.x + this.t * 20, star.y + this.t * 3);

                let alpha = map(noiseVal, 0, 1, 20, 255);
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

export function setup() {
    background(180, 180, 220);
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
        numHarmonics: 3,
        filterFrequency: 1000,
        filterResonance: 5
    });
}

// Helper function to start audio (call this on user interaction)
export async function startAudio() {
    await Tone.start();
    console.log('Audio context started');
}

// Expose synth control functions for easy triggering
export function playChord(noteOffsets) {
    if (synth) {
        synth.playChord(noteOffsets);
    }
}

export function stopSound() {
    if (synth) {
        synth.stopAll();
    }
}

export function setWaveform(value) {
    if (synth) {
        synth.setWaveform(value);
    }
}

export function setHarmonics(num) {
    if (synth) {
        synth.setHarmonics(num);
    }
}

export function setFilter(frequency, resonance) {
    if (synth) {
        synth.setFilter(frequency, resonance);
    }
}

export function setVolume(volume) {
    if (synth) {
        synth.setVolume(volume);
    }
}

export function draw() {
    // Get time from musician's phone orientation (or fallback to auto-animate)
    let t = getRoleValue('time');
    world.update(t);
    world.render();

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
