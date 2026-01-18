const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const resultsList = document.getElementById('results-list');
const toggleBtn = document.getElementById('toggle-camera');

let stream = null;
let isScanning = false;
let socket = io();

// Camera management
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        });
        video.srcObject = stream;
        toggleBtn.textContent = 'Stop Camera';
        isScanning = true;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            scanFrame();
        };
    } catch (err) {
        console.error("Error accessing camera: ", err);
        alert("Cannot access camera. Please check permissions.");
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        toggleBtn.textContent = 'Start Camera';
        isScanning = false;
    }
}

toggleBtn.addEventListener('click', () => {
    if (isScanning) {
        stopCamera();
    } else {
        startCamera();
    }
});

// Frame processing
function scanFrame() {
    if (!isScanning) return;

    // We can also sharpen the image on the client side using canvas if needed, 
    // but the backend enhancement is more powerful.
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    socket.emit('image', imageData);

    // Optimized interval for high quality
    setTimeout(scanFrame, 400);
}

// Result handling
socket.on('results', (results) => {
    if (results.length > 0) {
        if (resultsList.querySelector('.placeholder')) {
            resultsList.innerHTML = '';
        }

        results.forEach(result => {
            const existing = Array.from(resultsList.children).find(el =>
                el.innerText.includes(result.data)
            );

            if (!existing) {
                const item = document.createElement('div');
                item.className = 'result-item';
                item.innerHTML = `
                    <div class="result-data">${result.data}</div>
                    <div class="result-type">${result.type}</div>
                `;
                resultsList.prepend(item);

                if (resultsList.children.length > 5) {
                    resultsList.removeChild(resultsList.lastChild);
                }
            }
        });
    }
});
