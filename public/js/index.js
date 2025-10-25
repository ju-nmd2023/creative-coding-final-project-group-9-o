const createInstanceBtn = document.getElementById('create-instance-btn');
const createInstanceDiv = document.getElementById('create-instance');
const instructionsDiv = document.getElementById('instructions');
const qrCodeEl = document.getElementById('qr-code');
const deviceCountEl = document.getElementById('device-count');
const deviceListEl = document.getElementById('device-list');

let socket = null;
let connectedDevices = new Map();

function updateDeviceDisplay() {
    deviceCountEl.textContent = connectedDevices.size;

    // Clear and rebuild device list
    deviceListEl.innerHTML = '';
    for (const [id, device] of connectedDevices) {
        const deviceItem = document.createElement('div');
        deviceItem.className = 'device-item';
        deviceItem.textContent = `Participant ${device.shortId}`;
        deviceListEl.appendChild(deviceItem);
    }
}

function connectWebSocket(instanceId) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    socket = new WebSocket(wsUrl);

    socket.onopen = () => {
        console.log('Connected to server');
        socket.send(JSON.stringify({
            type: 'identify',
            role: 'stage'
        }));
    };

    socket.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);

            // Handle musician joining
            if (data.type === 'join' && data.role === 'musician') {
                const shortId = data.id.substring(0, 8);
                connectedDevices.set(data.id, { shortId, joinedAt: Date.now() });
                updateDeviceDisplay();

                // Automatically redirect to stage view when first musician joins
                if (connectedDevices.size === 1) {
                    window.location.href = '/stage';
                }
            }
            // Handle musician leaving
            else if (data.type === 'disconnect' && data.role === 'musician') {
                connectedDevices.delete(data.id);
                updateDeviceDisplay();
            }
            // Handle initial musician list
            else if (data.type === 'musician-list') {
                connectedDevices.clear();
                for (const musicianId of data.musicians) {
                    const shortId = musicianId.substring(0, 8);
                    connectedDevices.set(musicianId, { shortId, joinedAt: Date.now() });
                }
                updateDeviceDisplay();
            }
        } catch (err) {
            // Ignore non-JSON messages
        }
    };

    socket.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
        console.log('WebSocket disconnected');
        // Could add reconnection logic here
    };
}

createInstanceBtn.addEventListener('click', () => {
    fetch('/api/instance/new', { method: 'POST' })
        .then(res => res.json())
        .then(({ instanceId }) => {
            createInstanceDiv.classList.add('hidden');
            instructionsDiv.classList.remove('hidden');

            const joinUrl = new URL(`/join?instance=${instanceId}`, window.location.origin).href;

            // Clear any existing QR code
            qrCodeEl.innerHTML = '';

            new QRCode(qrCodeEl, {
                text: joinUrl,
                width: 256,
                height: 256,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.M
            });

            history.pushState({ instanceId }, `SoMoS - Session ${instanceId}`, `/?instance=${instanceId}`);

            // Connect to WebSocket to track devices
            connectWebSocket(instanceId);
        });
});

// Check if instanceId is in the URL on page load
const urlParams = new URLSearchParams(window.location.search);
const instanceId = urlParams.get('instance');

if (instanceId) {
    createInstanceDiv.classList.add('hidden');
    instructionsDiv.classList.remove('hidden');

    const joinUrl = new URL(`/join?instance=${instanceId}`, window.location.origin).href;

    new QRCode(qrCodeEl, {
        text: joinUrl,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });

    // Connect to WebSocket to track devices
    connectWebSocket(instanceId);
}
