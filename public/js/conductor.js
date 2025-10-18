const socket = io();
const dataEl = document.getElementById('data');
const countEl = document.getElementById('count');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Track musicians by ID
const musicians = new Map();

// Canvas setup
function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 40; // Account for header
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

window._cc_project_role = 'musician';

// Socket handlers
socket.on('connect', () => {
    socket.emit('message', JSON.stringify({
        type: 'identify',
        role: 'conductor'
    }));
});

socket.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.type === 'clientCount') {
        countEl.textContent = data.count;
    } else if (data.type === 'sensorData') {
        musicians.set(data.musicianId, data.data);
        dataEl.textContent = JSON.stringify(data, null, 2);
    } else if (data.type === 'disconnect') {
        musicians.delete(data.musicianId);
    }
});

// Draw acceleration bars for a musician
function drawAccelerationBars(x, y, accel, musicianId) {
    const barWidth = 40;
    const barSpacing = 60;
    const maxHeight = 100;
    const scale = 10; // m/s² to pixels

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';

    // Draw musician ID
    ctx.fillStyle = '#0f0';
    ctx.fillText(`Musician ${musicianId.substring(0, 8)}`, x + barSpacing, y - maxHeight - 20);

    const axes = [
        { label: 'X', value: accel.x, offset: 0, color: '#f00' },
        { label: 'Y', value: accel.y, offset: barSpacing, color: '#0f0' },
        { label: 'Z', value: accel.z, offset: barSpacing * 2, color: '#00f' }
    ];

    axes.forEach(axis => {
        const barX = x + axis.offset;
        const barHeight = Math.max(-maxHeight, Math.min(maxHeight, axis.value * scale));

        // Draw baseline
        ctx.strokeStyle = '#333';
        ctx.beginPath();
        ctx.moveTo(barX - barWidth/2, y);
        ctx.lineTo(barX + barWidth/2, y);
        ctx.stroke();

        // Draw bar
        ctx.fillStyle = axis.color;
        if (barHeight > 0) {
            ctx.fillRect(barX - barWidth/2, y - barHeight, barWidth, barHeight);
        } else {
            ctx.fillRect(barX - barWidth/2, y, barWidth, -barHeight);
        }

        // Draw axis label
        ctx.fillStyle = '#fff';
        ctx.fillText(axis.label, barX, y + 15);

        // Draw value
        ctx.fillText(axis.value.toFixed(2), barX, y + 28);
    });
}

// Visualization loop
function draw() {
    // Clear canvas
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = 50; // Scale factor for position

    let i = 0;
    for (const [musicianId, state] of musicians) {
        const accel = state.acceleration || { x: 0, y: 0, z: 0 };

        // Draw acceleration bars in top area
        const barAreaY = 150;
        const barAreaX = 100 + i * 200;
        drawAccelerationBars(barAreaX, barAreaY, accel, musicianId);

        // Color per musician
        const hue = (i * 137.5) % 360;
        ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;

        if (state.tracking) {
            // Draw position as circle
            const x = centerX + state.position.x * scale;
            const y = centerY + state.position.y * scale;

            ctx.beginPath();
            ctx.arc(x, y, 10, 0, Math.PI * 2);
            ctx.fill();

            // Draw velocity as line
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(
                x + state.velocity.x * scale * 0.5,
                y + state.velocity.y * scale * 0.5
            );
            ctx.lineWidth = 2;
            ctx.stroke();
        } else {
            // Not tracking: just show orientation as rotating line
            const angle = (state.orientation.alpha || 0) * Math.PI / 180;
            const len = 50;

            ctx.save();
            ctx.translate(centerX + i * 100 - 100, centerY);
            ctx.rotate(angle);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len, 0);
            ctx.lineWidth = 3;
            ctx.stroke();
            ctx.restore();
        }

        i++;
    }

    requestAnimationFrame(draw);
}

draw();

