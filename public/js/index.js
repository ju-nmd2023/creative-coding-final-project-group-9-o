const createInstanceBtn = document.getElementById('create-instance-btn');
const createInstanceDiv = document.getElementById('create-instance');
const instructionsDiv = document.getElementById('instructions');
const qrCodeEl = document.getElementById('qr-code');

createInstanceBtn.addEventListener('click', () => {
    fetch('/api/instance/new', { method: 'POST' })
        .then(res => res.json())
        .then(({ instanceId }) => {
            createInstanceDiv.classList.add('hidden');
            instructionsDiv.classList.remove('hidden');

            const joinUrl = new URL(`/join/${instanceId}`, window.location.origin).href;

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
        });
});

// Check if instanceId is in the URL on page load
const urlParams = new URLSearchParams(window.location.search);
const instanceId = urlParams.get('instance');

if (instanceId) {
    createInstanceDiv.classList.add('hidden');
    instructionsDiv.classList.remove('hidden');

    const joinUrl = new URL(`/join/${instanceId}`, window.location.origin).href;

    new QRCode(qrCodeEl, {
        text: joinUrl,
        width: 256,
        height: 256,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.M
    });
}
