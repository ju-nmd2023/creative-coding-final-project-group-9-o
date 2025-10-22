const hill_params = new Array(4);
const layers = {};

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
}

function hills(layer = layers.hills, erase = false) {
    layer.fill(20, 200, 50);
    layer.stroke(0);
    for (let i = 0; i < 4; i++) {
        const points = Math.floor(width * 0.75);
        let phase, amp, freq;
        [phase, amp, freq] = hill_params[i];
        const hill = (x) => {
            let angle = map(x, 0, points, 0, TWO_PI);
            return sin(phase + angle * freq) * amp;
        };

        if (erase) layer.erase();
        layer.beginShape();
        for (let x = 0; x <= points; x++) {
            layer.vertex(
                map(x, 0, points, 0, width),
                map(hill(x), -1, 1, height/4, height - height/4)
            );
        }
        layer.vertex(width, height);
        layer.vertex(0, height);
        layer.endShape(CLOSE);
        if (erase) layer.noErase();
    }
}

function sky(sunElevation) {
    const skyColors = {
        night: color(10, 15, 40),
        twilight: color(100, 60, 100),
        sunrise: color(255, 140, 100),
        day: color(135, 206, 235),
    };

    const skyStages = {
        night: -1,
        twilight: -0.2,
        sunrise: 0.5,
    };

    let topColor, bottomColor;
    
    if (sunElevation < skyStages.night) {
        // Night
        let t = map(sunElevation, -4, skyStages.night, 0, 1);
        topColor = lerpColor(skyColors.night, color(2, 0, 10), t);
        bottomColor = skyColors.night;
    } else if (sunElevation < skyStages.twilight) {
        // Dawn/dusk twilight
        let t = map(sunElevation, skyStages.night, skyStages.twilight, 0, 1);
        topColor = lerpColor(skyColors.night, skyColors.twilight, t);
        bottomColor = lerpColor(skyColors.night, skyColors.sunrise, t);
    } else if (sunElevation < skyStages.sunrise) {
        // Sunrise/sunset
        let t = map(sunElevation, skyStages.twilight, skyStages.sunrise, 0, 1);
        topColor = lerpColor(skyColors.twilight, skyColors.day, t);
        bottomColor = lerpColor(skyColors.sunrise, skyColors.day, t);
    } else {
        // Full day
        topColor = skyColors.day;
        bottomColor = color(180, 220, 255); // Lighter at horizon
    }

    for (let y = 0; y < height; y++) {
        let amt = map(y, 0, height, 0, 1);
        layers.sky.stroke(lerpColor(topColor, bottomColor, amt));
        layers.sky.line(0, y, width, y);
    }
}

function daylight(t) {
    let angle = t * TWO_PI - HALF_PI; // Start at bottom
    let centerX = width / 2;
    let centerY = height * 1.08;
    let radius = height * 0.97;
    
    let sunX = centerX + cos(angle) * radius;
    let sunY = centerY + sin(angle) * radius;

    let sunElevation = map(sunY, height * 0.64, centerY - radius, -1, 1);
    sky(sunElevation);

    layers.skyObjects.clear();
    
    if (sunY < height) {
        layers.skyObjects.noStroke();
        layers.skyObjects.fill(255, 220, 0);
        layers.skyObjects.circle(sunX, sunY, 60);
    }
    
    let moonAngle = angle + PI;
    let moonX = centerX + cos(moonAngle) * radius;
    let moonY = centerY + sin(moonAngle) * radius;
    
    // Draw moon when it's nighttime (above horizon)
    if (moonY < height) {
        layers.skyObjects.noStroke();
        layers.skyObjects.fill(240, 240, 255);
        layers.skyObjects.circle(moonX, moonY, 50);
        // Add some craters
        layers.skyObjects.fill(220, 220, 235);
        layers.skyObjects.circle(moonX - 10, moonY - 5, 12);
        layers.skyObjects.circle(moonX + 8, moonY + 8, 8);
    }
}

function world(t) {
    daylight(t);
    hills();
}

export function draw() {
    // Example: cycle through day (you can pass any t from 0 to 1)
    let t = (frameCount % 1000) / 1000; // Animate over 300 frames
    world(t);

    hills(layers.skyObjects, true);

    image(layers.sky, 0, 0);
    image(layers.skyObjects, 0, 0);
    blendMode(MULTIPLY);
    image(layers.hills, 0, 0);
    blendMode(BLEND);
    // noLoop(); // Comment out to see animation, or uncomment for static
}
