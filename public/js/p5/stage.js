import * as prairie from './prairie.js';

const sketch = prairie;

const beginScreen = document.getElementById('begin-screen');
const beginButton = document.getElementById('begin-button');

beginButton.addEventListener('click', async () => {
    // Start Tone.js audio context
    await Tone.start();
    console.log('Audio context started');

    // Start the sketch if it has a start method
    if (sketch.startSketch) {
        sketch.startSketch();
    }

    // Fade out the begin screen
    beginScreen.classList.add('fade-out');

    // Remove the screen completely after fade animation
    setTimeout(() => {
        beginScreen.style.display = 'none';
    }, 500);
});

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

