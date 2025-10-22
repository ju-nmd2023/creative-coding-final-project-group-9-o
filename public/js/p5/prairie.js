
export function setup() {
    background(180, 180, 220);
}

function hills() {
    fill(20, 200, 50);
    for (let i = 0; i < 4; i++) {
        const points = Math.floor(width * 0.75);
        const phase = random(0, TWO_PI);
        const freq = random(0.2, 0.4);
        const amp = random(0.2, 1);
        const hill = (x) => {
            let angle = map(x, 0, points, 0, TWO_PI);
            return sin(phase + angle * freq) * amp;
        };

        beginShape();
        for (let x = 0; x <= points; x++) {
            vertex(
                map(x, 0, points, 0, width),
                map(hill(x), -1, 1, height/4, height - height/4)
            );
        }
        vertex(width, height);
        vertex(0, height);
        endShape(CLOSE);
    }
}

function daylight(t) {

}

export function draw() {
    hills();
    noLoop();
}

