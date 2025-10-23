import * as prarie from './prairie.js';

window.setup = function () {
    createCanvas(innerWidth, innerHeight);
    prarie.setup();
}

window.draw = function () {
    prarie.draw();
}

// Expose synth control functions to global scope
window.startAudio = prarie.startAudio;
window.playChord = prarie.playChord;
window.stopSound = prarie.stopSound;
window.setWaveform = prarie.setWaveform;
window.setHarmonics = prarie.setHarmonics;
window.setFilter = prarie.setFilter;
window.setVolume = prarie.setVolume;

