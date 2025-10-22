import * as prarie from './prairie.js';

window.setup = function () {
    createCanvas(innerWidth, innerHeight);
    prarie.setup();
}

window.draw = function () {
    prarie.draw();
}

