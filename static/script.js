const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay.getContext('2d');
const loading = document.getElementById('loading');
const statusMessage = document.getElementById('status-message');
const ageElement = document.getElementById('age');
const genderElement = document.getElementById('gender');
const emotionElement = document.getElementById('emotion');
const nameInput = document.getElementById('name-input');
const registerBtn = document.getElementById('register-btn');
const registerStatus = document.getElementById('register-status');
const analyzeBtn = document.getElementById('analyze-btn');
const analysisStatus = document.getElementById('analysis-status');
let matchStatus = null;  // Declare matchStatus in global scope

// Create and add match status element after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const matchSection = document.querySelector('.match-section');
    if (matchSection) {
        matchStatus = document.createElement('div');
        matchStatus.id = 'match-status';
        matchStatus.className = 'match-status';
        matchSection.appendChild(matchStatus);
    } else {
        console.error('Match section not found in DOM');
    }
});

// Emotion emoji mapping with Uzbek translations
const emotionEmojis = {
    'happy': '😊',
    'sad': '😢',
    'angry': '😠',
    'fear': '😨',
    'surprise': '😲',
    'neutral': '😐',
    'disgust': '🤢'
};

// Emotion translations to Uzbek
const emotionTranslations = {
    'happy': 'Baxtli',
    'sad': 'G\'amgin',
    'angry': 'Jahli chiqqan',
    'fear': 'Qo\'rqqan',
    'surprise': 'Ajablanib qolgan',
    'neutral': 'Betaraf',
    'disgust': 'Jirkanib qolgan'
};

// Emotion colors mapping
const emotionColors = {
    'happy': '#FFD700',
    'sad': '#4169E1',
    'angry': '#FF4500',
    'fear': '#800080',
    'surprise': '#FFA500',
    'neutral': '#808080',
    'disgust': '#228B22'
};

// Gender translations to Uzbek
const genderTranslations = {
    'Man': 'Erkak',
    'Woman': 'Ayol'
};

// Analysis state
let isInitialAnalysis = true;
let isAnalyzing = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500;

// Set canvas dimensions
function setCanvasDimensions() {
    const videoWidth = video.videoWidth || 640;
    const videoHeight = video.videoHeight || 480;
    
    // Set canvas to match video dimensions exactly
    canvas.width = videoWidth;
    canvas.height = videoHeight;
    overlay.width = videoWidth;
    overlay.height = videoHeight;
}

// Initialize camera
async function initCamera() {
    try {
        // First check if we already have a stream
        if (video.srcObject) {
            const tracks = video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            } 
        });

        // Set the stream and wait for it to be ready
        video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
            video.onloadedmetadata = () => {
                setCanvasDimensions();
                video.style.width = '100%';
                video.style.height = '100%';
                video.style.objectFit = 'cover';
                resolve();
            };
        });

        // Ensure video starts playing
        try {
            await video.play();
            console.log('Video playback started successfully');
        } catch (playError) {
            console.error('Video playback error:', playError);
            throw new Error('Video oynatishda xatolik yuz berdi');
        }

        statusMessage.textContent = 'Kamera ulandi';
        console.log('Camera initialized successfully');
        return true;

    } catch (err) {
        console.error('Camera initialization error:', err);
        statusMessage.textContent = 'Kameraga kirishda xatolik: ' + err.message;
        return false;
    }
}

// Clean up function
function cleanupCamera() {
    if (video.srcObject) {
        const tracks = video.srcObject.getTracks();
        tracks.forEach(track => {
            track.stop();
        });
        video.srcObject = null;
    }
}

// Handle visibility change
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause analysis when tab is hidden
        isAnalyzing = false;
        loading.classList.remove('active');
    } else {
        // Resume analysis when tab becomes visible
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            analyzeFrame();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', cleanupCamera);

// Start the application
async function startApp() {
    try {
        await initCamera();
        
        // Ensure video is playing before starting analysis
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            console.log('Video is ready, starting initial analysis...');
            await analyzeFrame();
        }

        // Set up video event listeners
        video.addEventListener('playing', () => {
            console.log('Video started playing');
            if (!isAnalyzing) {
                analyzeFrame();
            }
        });

        // Add error handling for video element
        video.addEventListener('error', (error) => {
            console.error('Video element error:', error);
            statusMessage.textContent = 'Video elementida xatolik yuz berdi';
            cleanupCamera();
            // Try to reinitialize after a short delay
            setTimeout(initCamera, 1000);
        });

    } catch (error) {
        console.error('Application startup error:', error);
        statusMessage.textContent = 'Dasturni ishga tushirishda xatolik yuz berdi';
    }
}

// Start the application
startApp();

// Draw face rectangle with match status
function drawFaceRectangle(face) {
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    
    if (!face || !face.region) return;

    const { x, y, w, h } = face.region;
    // Calculate flipped X coordinate for mirrored video
    const flippedX = overlay.width - x - w;  // Flip the x coordinate
    
    // Make the mask much larger and more proportional
    const maskWidth = w * 1.8;  // Increase width by 80%
    const maskHeight = h * 0.6;  // Make height 60% of face height
    const maskX = flippedX - (maskWidth - w) / 2;  // Center the wider mask
    const maskY = y + h * 0.25;  // Position mask slightly lower on the face
    
    // Set color based on match status
    let rectColor, borderColor, textColor;
    if (face.match) {
        if (face.match.confidence > 0.6) {
            // High confidence match
            rectColor = 'rgba(46, 213, 115, 0.2)';  // Green with more opacity
            borderColor = '#2ed573';
            textColor = '#2ed573';
        } else {
            // Low confidence match
            rectColor = 'rgba(255, 159, 67, 0.2)';  // Orange with more opacity
            borderColor = '#ff9f43';
            textColor = '#ff9f43';
        }
    } else {
        // No match
        rectColor = 'rgba(255, 71, 87, 0.2)';  // Red with more opacity
        borderColor = '#ff4757';
        textColor = '#ff4757';
    }

    // Draw rectangle with stronger glow effect
    overlayCtx.shadowColor = borderColor;
    overlayCtx.shadowBlur = 20;  // Increased glow
    overlayCtx.lineWidth = 4;    // Thicker border
    
    // Draw semi-transparent background with rounded corners
    overlayCtx.beginPath();
    const radius = maskHeight * 0.25;  // Larger radius for rounded corners
    overlayCtx.moveTo(maskX + radius, maskY);
    overlayCtx.lineTo(maskX + maskWidth - radius, maskY);
    overlayCtx.quadraticCurveTo(maskX + maskWidth, maskY, maskX + maskWidth, maskY + radius);
    overlayCtx.lineTo(maskX + maskWidth, maskY + maskHeight - radius);
    overlayCtx.quadraticCurveTo(maskX + maskWidth, maskY + maskHeight, maskX + maskWidth - radius, maskY + maskHeight);
    overlayCtx.lineTo(maskX + radius, maskY + maskHeight);
    overlayCtx.quadraticCurveTo(maskX, maskY + maskHeight, maskX, maskY + maskHeight - radius);
    overlayCtx.lineTo(maskX, maskY + radius);
    overlayCtx.quadraticCurveTo(maskX, maskY, maskX + radius, maskY);
    overlayCtx.closePath();
    
    overlayCtx.fillStyle = rectColor;
    overlayCtx.fill();
    
    // Draw border
    overlayCtx.strokeStyle = borderColor;
    overlayCtx.stroke();
    
    // Draw match status above the rectangle if there's a match
    if (face.match) {
        const matchY = y - 15;  // Moved text higher
        const confidence = Math.round(face.match.confidence * 100);
        
        // Draw background for text
        overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';  // Darker background
        overlayCtx.fillRect(
            maskX + maskWidth/2 - 120,  // Wider text background
            matchY - 30,
            240,  // Wider text background
            35    // Taller text background
        );
        
        // Draw text with larger font
        overlayCtx.font = 'bold 18px Inter';  // Larger font
        overlayCtx.textAlign = 'center';
        overlayCtx.fillStyle = textColor;
        overlayCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        overlayCtx.shadowBlur = 6;
        overlayCtx.shadowOffsetX = 1;
        overlayCtx.shadowOffsetY = 1;
        
        overlayCtx.fillText(
            `${face.match.name} (${confidence}%)`,
            maskX + maskWidth/2,
            matchY
        );
    }
    
    // Reset shadow
    overlayCtx.shadowBlur = 0;
    overlayCtx.shadowOffsetX = 0;
    overlayCtx.shadowOffsetY = 0;
}

// Update analysis results
function updateResults(data) {
    if (data.error) {
        statusMessage.textContent = `Xatolik: ${data.error}`;
        return;
    }

    // Update text results
    ageElement.textContent = `${data.age} yosh`;
    genderElement.textContent = genderTranslations[data.dominant_gender] || data.dominant_gender;
    
    // Update emotion with emoji and Uzbek translation
    const emotion = data.dominant_emotion;
    const emoji = emotionEmojis[emotion] || '😐';
    const emotionUz = emotionTranslations[emotion] || emotion;
    emotionElement.textContent = `${emoji} ${emotionUz}`;
    
    // Update face rectangle and match status
    if (data.region) {
        drawFaceRectangle(data);
        
        // Update match status in UI if element exists
        if (matchStatus) {
            if (data.match) {
                const confidence = Math.round(data.match.confidence * 100);
                matchStatus.textContent = `${data.match.name} bilan mos keldi (${confidence}% ishonchlilik)`;
                matchStatus.className = `match-status ${confidence > 60 ? 'matched' : 'low-confidence'}`;
            } else {
                matchStatus.textContent = 'Mos kelgan yuz topilmadi';
                matchStatus.className = 'match-status no-match';
            }
        }
    } else {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        if (matchStatus) {
            matchStatus.textContent = 'Yuz aniqlanmadi';
            matchStatus.className = 'match-status no-face';
        }
    }

    // Update status with confidence
    if (data.face_confidence) {
        const confidence = Math.round(data.face_confidence * 100);
        statusMessage.textContent = `Yuz aniqlandi (${confidence}% ishonchlilik)`;
    }
}

// Add debouncing utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Main analysis function
async function analyzeFrame() {
    if (isAnalyzing || video.readyState < video.HAVE_CURRENT_DATA) {
        console.log('Skipping analysis - video not ready or already analyzing');
        return;
    }

    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        console.log('Skipping analysis - too soon since last request');
        return;
    }

    isAnalyzing = true;
    loading.classList.add('active');
    analyzeBtn.disabled = true;
    
    try {
        console.log('Starting frame analysis...');
        // Draw current frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Get image data with lower quality for better performance
        const imageData = canvas.toDataURL('image/jpeg', 0.7);

        // Send to server
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Juda ko\'p so\'rovlar yuborildi. Iltimos, biroz kuting.');
            }
            throw new Error(`HTTP xatosi! status: ${response.status}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error);
        }
        
        console.log('Analysis completed successfully');
        updateResults(data);
        lastRequestTime = Date.now();
        
        // Update status message
        if (isInitialAnalysis) {
            console.log('Initial analysis completed');
            analysisStatus.textContent = 'Dastlabki tahlil yakunlandi. Yangilash uchun tugmani bosing.';
            isInitialAnalysis = false;
        } else {
            analysisStatus.textContent = 'Tahlil muvaffaqiyatli yangilandi.';
        }
    } catch (error) {
        console.error('Analysis error:', error);
        statusMessage.textContent = `Xatolik: ${error.message}`;
        analysisStatus.textContent = 'Tahlil amalga oshirilmadi. Qaytadan urinib ko\'ring.';
    } finally {
        // Remove loading indicator before enabling the button
        loading.classList.remove('active');
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        
        // Schedule next analysis if this was initial analysis
        if (isInitialAnalysis) {
            setTimeout(() => {
                if (video.readyState >= video.HAVE_CURRENT_DATA) {
                    analyzeFrame();
                }
            }, 1000);
        }
    }
}

// Add click handler for analyze button
analyzeBtn.addEventListener('click', () => {
    if (!isAnalyzing) {
        analyzeFrame();
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (video.videoWidth) {
        setCanvasDimensions();
    }
});

// Registration handling
let isRegistering = false;

async function handleRegistration() {
    if (isRegistering || !nameInput.value.trim()) {
        return;
    }

    isRegistering = true;
    registerBtn.disabled = true;
    registerStatus.textContent = 'Ro\'yxatdan o\'tkazilmoqda...';
    registerStatus.className = 'register-status';

    try {
        // Get current frame
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = canvas.toDataURL('image/jpeg', 0.7);

        // Send registration request
        const response = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: nameInput.value.trim(),
                image: imageData
            })
        });

        if (!response.ok) {
            if (response.status === 429) {
                throw new Error('Juda ko\'p so\'rovlar yuborildi. Iltimos, biroz kuting.');
            }
            throw new Error(`HTTP xatosi! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            registerStatus.textContent = result.message;
            registerStatus.className = 'register-status success';
            nameInput.value = '';  // Clear input
        } else {
            registerStatus.textContent = result.message || 'Ro\'yxatdan o\'tkazish amalga oshirilmadi';
            registerStatus.className = 'register-status error';
        }
    } catch (error) {
        console.error('Ro\'yxatdan o\'tkazish xatosi:', error);
        registerStatus.textContent = error.message || 'Ro\'yxatdan o\'tkazish vaqtida xatolik yuz berdi';
        registerStatus.className = 'register-status error';
    } finally {
        isRegistering = false;
        registerBtn.disabled = false;
    }
}

// Debounced registration with shorter delay
const debouncedRegister = debounce(handleRegistration, 500);

// Update event listeners
registerBtn.addEventListener('click', () => {
    if (nameInput.value.trim()) {
        debouncedRegister();
    } else {
        registerStatus.textContent = 'Iltimos, ism kiriting';
        registerStatus.className = 'register-status error';
    }
});

nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        if (nameInput.value.trim()) {
            debouncedRegister();
        } else {
            registerStatus.textContent = 'Iltimos, ism kiriting';
            registerStatus.className = 'register-status error';
        }
    }
});
