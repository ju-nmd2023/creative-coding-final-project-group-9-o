import * as prairie from './prairie.js';

const sketch = prairie;

window.setup = function () {
    createCanvas(innerWidth, innerHeight);
    sketch.setup();
}

window.draw = function () {
    sketch.draw();
}

window.mousePressed = function() {
    if (sketch.mousePressed) {
        sketch.mousePressed();
    }
}

window.touchStarted = function() {
    if (sketch.touchStarted) {
        sketch.touchStarted();
    }
}

window.windowResized = function() {
    if (sketch.windowResized) {
        sketch.windowResized();
    }
}

window.getSound = prairie.getSound;

