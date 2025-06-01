const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const overlay = document.getElementById('overlay');
const overlayCtx = overlay ? overlay.getContext('2d') : null;
const loading = document.getElementById('loading');
const statusMessage = document.getElementById('status-message');
const ageElement = document.getElementById('age');
const genderElement = document.getElementById('gender');
const emotionElement = document.getElementById('emotion');
const nameInput = document.getElementById('name-input');
const registerBtn = document.getElementById('register-btn');
const registerStatus = document.getElementById('register-status');
const analyzeBtn = document.getElementById('analyze-btn');
const autoModeToggle = document.getElementById('auto-mode-toggle');
const analysisStatus = document.getElementById('analysis-status');
let matchStatus = null;  // Declare matchStatus in global scope

let isAutoMode = true; // Flag to control auto analysis
let isAnalyzing = false;
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 500;
const ANALYSIS_INTERVAL = 700; // ms between analyses

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

    // Set initial auto mode state
    isAutoMode = autoModeToggle.checked;
});

// Verify critical elements exist
if (!video || !canvas || !overlay) {
    console.error('Critical video elements not found');
    alert('Dastur elementlari topilmadi. Sahifani qayta yuklang.');
    throw new Error('Critical video elements not found');
}

// Safe update status message function
function updateStatusMessage(message) {
    if (statusMessage) {
        statusMessage.textContent = message;
    } else {
        console.warn('Status message element not found');
    }
}

// Safe update loading state
function updateLoadingState(isActive) {
    if (loading) {
        if (isActive) {
            loading.classList.add('active');
        } else {
            loading.classList.remove('active');
        }
    } else {
        console.warn('Loading element not found');
    }
}

// Safe update button state
function updateButtonState(button, isDisabled) {
    if (button) {
        button.disabled = isDisabled;
    } else {
        console.warn('Button element not found');
    }
}

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

// Race translations to Uzbek
const raceTranslations = {
    'asian': 'Osiyolik',
    'indian': 'Hind',
    'black': 'Qora tanli',
    'white': 'Oq tanli',
    'middle eastern': 'Yaqin Sharq',
    'latino hispanic': 'Latino'
};

// Analysis state
let isInitialAnalysis = true;

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
        if (!video) {
            throw new Error('Video elementi topilmadi');
        }

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

        // Wait for video to actually start playing
        await new Promise((resolve) => {
            video.onplaying = () => {
                console.log('Video is now playing');
                // Add a small delay to ensure the first frame is good
                setTimeout(resolve, 1000);
            };
            video.play().catch(err => {
                console.error('Video play error:', err);
                throw new Error('Video yuklashda xatolik yuz berdi');
            });
        });

        updateStatusMessage('Kamera ulandi');
        console.log('Camera initialized successfully');
        return true;

    } catch (err) {
        console.error('Camera initialization error:', err);
        updateStatusMessage('Kameraga kirishda xatolik: ' + err.message);
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
        updateLoadingState(false);
    } else {
        // Resume analysis when tab becomes visible
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            analyzeFrame();
        }
    }
});

// Handle page unload
window.addEventListener('beforeunload', cleanupCamera);

// Handle auto mode toggle
autoModeToggle.addEventListener('change', (e) => {
    isAutoMode = e.target.checked;
    if (isAutoMode) {
        // Start auto analysis if video is ready
        if (video.readyState >= video.HAVE_CURRENT_DATA) {
            analyzeFrame();
        }
    }
});

// Start the realtime analysis loop
function startRealtimeAnalysis() {
    if (!isAutoMode) return;
    
    function loop() {
        if (isAutoMode && !isAnalyzing && video.readyState >= video.HAVE_CURRENT_DATA) {
            analyzeFrame().then(() => {
                setTimeout(loop, ANALYSIS_INTERVAL);
            });
        } else if (isAutoMode) {
            setTimeout(loop, ANALYSIS_INTERVAL);
        }
    }
    loop();
}

// Stop realtime analysis
function stopRealtimeAnalysis() {
    isAutoMode = false;
    autoModeToggle.checked = false;
}

// Modify analyzeBtn to handle manual analysis
analyzeBtn.addEventListener('click', () => {
    if (!isAnalyzing && video.readyState >= video.HAVE_CURRENT_DATA) {
        analyzeFrame();
    }
});

// Start the application
async function startApp() {
    try {
        updateStatusMessage('Kamera ishga tushirilmoqda...');
        const cameraReady = await initCamera();
        
        if (!cameraReady) {
            throw new Error('Kamera ishga tushirilmadi');
        }

        // Only start analysis if camera is fully ready
        if (video.readyState >= video.HAVE_ENOUGH_DATA) {
            setCanvasDimensions();
            // Add a small delay before starting analysis
            setTimeout(() => {
                if (isAutoMode && autoModeToggle && autoModeToggle.checked) {
                    startRealtimeAnalysis();
                }
            }, 1500); // Wait 1.5 seconds after camera is ready
        }

        // Set up video event listeners
        video.addEventListener('playing', () => {
            console.log('Video started playing');
        });

        // Add error handling for video element
        video.addEventListener('error', (error) => {
            console.error('Video element error:', error);
            updateStatusMessage('Video elementida xatolik yuz berdi');
            cleanupCamera();
            // Try to reinitialize after a short delay
            setTimeout(initCamera, 1000);
        });

    } catch (error) {
        console.error('Application startup error:', error);
        updateStatusMessage('Dasturni ishga tushirishda xatolik yuz berdi');
    }
}

// Start the application
startApp();

// Draw face rectangle with match status
function drawFaceRectangle(face) {
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
    
    if (!face || !face.region) return;

    const { x, y, w, h, left_eye, right_eye } = face.region;
    // Calculate flipped X coordinate for mirrored video
    const flippedX = overlay.width - x - w;  // Flip the x coordinate
    
    // Calculate face mask dimensions
    const maskWidth = w * 1.4;  // Slightly wider than face
    const maskHeight = h;  // Taller to include forehead and chin
    const maskX = flippedX - (maskWidth - w) / 2;  // Center the mask
    const maskY = y - h * 0.2;  // Move mask up to include forehead
    
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

    // Draw face-shaped mask
    overlayCtx.save();
    
    // Create face shape path
    overlayCtx.beginPath();
    
    // Calculate control points for the face shape
    const centerX = maskX + maskWidth / 2;
    const centerY = maskY + maskHeight / 2;
    
    // Draw the main face oval
    overlayCtx.ellipse(
        centerX,
        centerY,
        maskWidth / 2,
        maskHeight / 2,
        0,
        0,
        Math.PI * 2
    );
    
    // Add glow effect
    overlayCtx.shadowColor = borderColor;
    overlayCtx.shadowBlur = 20;
    overlayCtx.lineWidth = 4;
    
    // Fill the face shape
    overlayCtx.fillStyle = rectColor;
    overlayCtx.fill();
    
    // Draw the border
    overlayCtx.strokeStyle = borderColor;
    overlayCtx.stroke();
    
    // Draw eyes if available
    if (left_eye && right_eye) {
        // Flip eye coordinates for mirrored video
        const flippedLeftEye = [overlay.width - left_eye[0], left_eye[1]];
        const flippedRightEye = [overlay.width - right_eye[0], right_eye[1]];
        
        // Calculate eye positions relative to face
        const eyeRadius = w * 0.08;  // Slightly larger eyes
        const eyeY = centerY - h * 0.1;  // Position eyes slightly above center
        
        // Draw left eye
        overlayCtx.beginPath();
        overlayCtx.ellipse(
            flippedLeftEye[0],
            eyeY,
            eyeRadius,
            eyeRadius * 0.6,  // Slightly oval shape
            0,
            0,
            Math.PI * 2
        );
        overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        overlayCtx.fill();
        overlayCtx.strokeStyle = borderColor;
        overlayCtx.lineWidth = 2;
        overlayCtx.stroke();
        
        // Draw right eye
        overlayCtx.beginPath();
        overlayCtx.ellipse(
            flippedRightEye[0],
            eyeY,
            eyeRadius,
            eyeRadius * 0.6,  // Slightly oval shape
            0,
            0,
            Math.PI * 2
        );
        overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        overlayCtx.fill();
        overlayCtx.strokeStyle = borderColor;
        overlayCtx.lineWidth = 2;
        overlayCtx.stroke();
        
        // Draw eye pupils
        const pupilRadius = eyeRadius * 0.4;
        
        // Left pupil
        overlayCtx.beginPath();
        overlayCtx.ellipse(
            flippedLeftEye[0],
            eyeY,
            pupilRadius,
            pupilRadius * 0.8,
            0,
            0,
            Math.PI * 2
        );
        overlayCtx.fillStyle = borderColor;
        overlayCtx.fill();
        
        // Right pupil
        overlayCtx.beginPath();
        overlayCtx.ellipse(
            flippedRightEye[0],
            eyeY,
            pupilRadius,
            pupilRadius * 0.8,
            0,
            0,
            Math.PI * 2
        );
        overlayCtx.fillStyle = borderColor;
        overlayCtx.fill();
    }
    
    // Draw match status above the face if there's a match
    if (face.match) {
        const matchY = maskY - 15;  // Position text above the face
        const confidence = Math.round(face.match.confidence * 100);
        
        // Draw background for text
        overlayCtx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        overlayCtx.fillRect(
            centerX - 120,
            matchY - 30,
            240,
            35
        );
        
        // Draw text
        overlayCtx.font = 'bold 18px Inter';
        overlayCtx.textAlign = 'center';
        overlayCtx.fillStyle = textColor;
        overlayCtx.shadowColor = 'rgba(0, 0, 0, 0.6)';
        overlayCtx.shadowBlur = 6;
        overlayCtx.shadowOffsetX = 1;
        overlayCtx.shadowOffsetY = 1;
        
        overlayCtx.fillText(
            `${face.match.name} (${confidence}%)`,
            centerX,
            matchY
        );
    }
    
    overlayCtx.restore();
}

// Update analysis results
function updateResults(data) {
    if (data.error) {
        updateStatusMessage(`Xatolik: ${data.error}`);
        return;
    }

    console.log('Analysis data received:', data); // Debug log for all data
    console.log('Race data:', data.dominant_race); // Debug log specifically for race

    // Update text results with null checks
    if (ageElement) ageElement.textContent = `${data.age} yosh`;
    if (genderElement) genderElement.textContent = genderTranslations[data.dominant_gender] || data.dominant_gender;
    
    // Update emotion with emoji and Uzbek translation
    if (emotionElement) {
        const emotion = data.dominant_emotion;
        const emoji = emotionEmojis[emotion] || '😐';
        const emotionUz = emotionTranslations[emotion] || emotion;
        emotionElement.textContent = `${emoji} ${emotionUz}`;
    }
    
    // Update race with Uzbek translation
    const raceElement = document.getElementById('race');
    if (raceElement) {
        const race = data.dominant_race;
        console.log('Processing race:', race); // Debug log for race processing
        const raceUz = raceTranslations[race?.toLowerCase()] || race;
        console.log('Translated race:', raceUz); // Debug log for translated race
        raceElement.textContent = raceUz;
        console.log('Race element updated with:', raceUz); // Debug log for DOM update
    } else {
        console.error('Race element not found in DOM'); // Debug log if element is missing
    }
    
    // Update face rectangle and match status
    if (data.region && overlayCtx) {
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
    } else if (overlayCtx) {
        overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
        if (matchStatus) {
            matchStatus.textContent = 'Yuz aniqlanmadi';
            matchStatus.className = 'match-status no-face';
        }
    }

    // Update status with confidence
    if (data.face_confidence) {
        const confidence = Math.round(data.face_confidence * 100);
        updateStatusMessage(`Yuz aniqlandi (${confidence}% ishonchlilik)`);
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
    if (!video || !canvas || !overlay) {
        console.error('Required elements not found');
        return;
    }

    if (isAnalyzing || video.readyState < video.HAVE_ENOUGH_DATA) {
        console.log('Skipping analysis - video not ready or already analyzing');
        return;
    }

    const now = Date.now();
    if (now - lastRequestTime < MIN_REQUEST_INTERVAL) {
        console.log('Skipping analysis - too soon since last request');
        return;
    }

    // Add additional check for video quality
    if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('Skipping analysis - video dimensions not ready');
        return;
    }

    isAnalyzing = true;
    updateLoadingState(true);
    updateButtonState(analyzeBtn, true);
    
    try {
        console.log('Starting frame analysis...');
        // Draw current frame to canvas
        const context = canvas.getContext('2d');
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Verify the canvas has valid image data
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        if (imageData.data.every(pixel => pixel === 0)) {
            throw new Error('Yaroqsiz video kadri');
        }

        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        // Create FormData and append the image
        const formData = new FormData();
        formData.append('image', blob, 'frame.jpg');

        // Send to server
        const response = await fetch('/analyze', {
            method: 'POST',
            body: formData
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
            if (analysisStatus) {
                analysisStatus.textContent = 'Dastlabki tahlil yakunlandi. Yangilash uchun tugmani bosing.';
            }
            isInitialAnalysis = false;
        } else if (analysisStatus) {
            analysisStatus.textContent = 'Tahlil muvaffaqiyatli yangilandi.';
        }
    } catch (error) {
        console.error('Analysis error:', error);
        updateStatusMessage(`Xatolik: ${error.message}`);
        if (analysisStatus) {
            analysisStatus.textContent = 'Tahlil amalga oshirilmadi. Qaytadan urinib ko\'ring.';
        }
    } finally {
        updateLoadingState(false);
        isAnalyzing = false;
        updateButtonState(analyzeBtn, false);
        
        // Schedule next analysis if auto mode is enabled
        if (isAutoMode && autoModeToggle && autoModeToggle.checked) {
            setTimeout(() => {
                if (video.readyState >= video.HAVE_ENOUGH_DATA) {
                    analyzeFrame();
                }
            }, ANALYSIS_INTERVAL);
        }
    }
}

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
        
        // Convert canvas to blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        
        // Create FormData
        const formData = new FormData();
        formData.append('name', nameInput.value.trim());
        formData.append('image', blob, 'face.jpg');

        // Send registration request
        const response = await fetch('/register', {
            method: 'POST',
            body: formData
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
