// const canvas = document.querySelector('#p5-main');

function setup() {
    createCanvas(windowWidth, windowHeight);
    background(0);
    colorMode(HSL);
}

let rotation = 0;

addEventListener('deviceorientation', (e) => {
    rotation = e.alpha;
});

function draw() { 
    background(Math.floor(rotation), 100, 60);
}

