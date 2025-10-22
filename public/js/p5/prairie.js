const hill_params = new Array(4);
const layers = {};

class World {
    constructor() {
        this.t = 0;
        this.sunX = 0;
        this.sunY = 0;
        this.moonX = 0;
        this.moonY = 0;
        this.sunElevation = 0;
        this.angle = 0;

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
        let topColor, bottomColor;

        if (this.sunElevation < this.skyStages.night) {
            // Night
            let t = map(this.sunElevation, -4, this.skyStages.night, 0, 1);
            topColor = lerpColor(this.skyColors.night, color(2, 0, 10), t);
            bottomColor = this.skyColors.night;
        } else if (this.sunElevation < this.skyStages.twilight) {
            // Dawn/dusk twilight
            let t = map(this.sunElevation, this.skyStages.night, this.skyStages.twilight, 0, 1);
            topColor = lerpColor(this.skyColors.night, this.skyColors.twilight, t);
            bottomColor = lerpColor(this.skyColors.night, this.skyColors.sunrise, t);
        } else if (this.sunElevation < this.skyStages.sunrise) {
            // Sunrise/sunset
            let t = map(this.sunElevation, this.skyStages.twilight, this.skyStages.sunrise, 0, 1);
            topColor = lerpColor(this.skyColors.twilight, this.skyColors.day, t);
            bottomColor = lerpColor(this.skyColors.sunrise, this.skyColors.day, t);
        } else {
            // Full day
            topColor = this.skyColors.day;
            bottomColor = color(180, 220, 255); // Lighter at horizon
        }

        return { top: topColor, bottom: bottomColor };
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
        let lightColor = this.getSkyColors().top;

        // Helper to multiply color with light (simulates realistic lighting)
        const applyLighting = (baseColor) => {
            let r = red(baseColor) * red(lightColor) / 255;
            let g = green(baseColor) * green(lightColor) / 255;
            let b = blue(baseColor) * blue(lightColor) / 255;
            return color(r, g, b);
        };

        layer.push();
        layer.translate(origin);
        layer.noStroke();
        layer.angleMode(DEGREES);
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
        this.pinwheel(createVector(width/2, height/2));
    }
}

let world;

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
}

export function draw() {
    // Example: cycle through day (you can pass any t from 0 to 1)
    let t = (frameCount + 300 % 1000) / 1000; // Animate over 300 frames
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
