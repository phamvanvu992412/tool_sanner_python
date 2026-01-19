class AI_Scanner {
    constructor(options) {
        this.container = options.container
        this.video = options.video
        this.canvas = options.canvas
        this.context = options.context;
        this.object_value = options.object_value;
        // this.socket = io('https://scanner.24hlaptop.com');
        this.socket = io('http://localhost:5000');
        this.toggleBtn = options.toggleBtn;
        this.stream = null;
        this.isScanning = false;
    
        this.setupEventListeners();
        this.setupSocket();
    }

    setupEventListeners() {
        if (this.toggleBtn) {
            this.toggleBtn.addEventListener('click', () => {
                if (this.isScanning) {
                    this.stop();
                } else {
                    this.start();
                }
            });
        }
    }

    setupSocket() {
        this.socket.on('results', (results) => {
            if (results.length > 0) {
                this.handleResults(results);
            }
        });
    }

    async start() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            this.video.srcObject = this.stream;
            // this.toggleBtn.textContent = 'Stop Camera';
            this.isScanning = true;

            this.video.onloadedmetadata = () => {
                this.canvas.width = this.video.videoWidth;
                this.canvas.height = this.video.videoHeight;
                this.scanFrame();
            };
        } catch (err) {
            console.error("Error accessing camera: ", err);
            alert("Cannot access camera. Please check permissions.");
        }
    }

    stop() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.video.srcObject = null;
            // this.toggleBtn.textContent = 'Start Camera';
            this.isScanning = false;
            if(this.container){
                this.container.style.display = 'none !important';
            }
            
        }
    }

    scanFrame() {
        if (!this.isScanning) return;

        this.context.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        const imageData = this.canvas.toDataURL('image/jpeg', 0.8);

        this.socket.emit('image', imageData);

        setTimeout(() => this.scanFrame(), 400);
    }

    handleResults(results) {
        if (this.resultsList && this.resultsList.querySelector('.placeholder')) {
            this.resultsList.innerHTML = '';
        }

        results.forEach(result => {
            if (this.object_value.tagName == 'INPUT' || this.object_value.tagName == 'TEXTAREA') {
                this.object_value.value = result.data;
            } else {
                this.object_value.innerText = result.data;
            }
            this.stop();
        });
    }
}
