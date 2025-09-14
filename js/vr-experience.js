/**
 * VR 180 Immersive Experience
 * Core functionality for VR video playback and interaction
 */

class VRExperience {
    constructor() {
        this.video = null;
        this.scene = null;
        this.isPlaying = false;
        this.isMuted = false;
        this.currentVolume = 0.7;
        this.isVRMode = false;
        
        this.init();
    }

    init() {
        // Wait for A-Frame to be ready
        document.addEventListener('DOMContentLoaded', () => {
            this.setupScene();
            this.setupVideo();
            this.setupInteractions();
            this.setupLoadingScreen();
            this.checkVRSupport();
        });
    }

    setupScene() {
        this.scene = document.querySelector('#vrScene');
        this.video = document.querySelector('#vr180Video');
        
        // Scene loaded event
        this.scene.addEventListener('loaded', () => {
            console.log('VR Scene loaded successfully');
            this.hideLoadingScreen();
        });

        // VR mode events
        this.scene.addEventListener('enter-vr', () => {
            this.isVRMode = true;
            this.onEnterVR();
        });

        this.scene.addEventListener('exit-vr', () => {
            this.isVRMode = false;
            this.onExitVR();
        });
    }

    setupVideo() {
        if (!this.video) {
            console.error('Video element not found');
            return;
        }

        // Video event listeners
        this.video.addEventListener('loadstart', () => {
            console.log('Video loading started');
            this.updateProgress(10);
        });

        this.video.addEventListener('loadedmetadata', () => {
            console.log('Video metadata loaded');
            this.updateProgress(50);
        });

        this.video.addEventListener('loadeddata', () => {
            console.log('Video data loaded');
            this.updateProgress(80);
        });

        this.video.addEventListener('canplaythrough', () => {
            console.log('Video ready to play');
            this.updateProgress(100);
            setTimeout(() => this.hideLoadingScreen(), 1000);
        });

        this.video.addEventListener('timeupdate', () => {
            this.updateVideoProgress();
        });

        this.video.addEventListener('ended', () => {
            this.video.currentTime = 0;
            this.video.play();
        });

        this.video.addEventListener('error', (e) => {
            console.error('Video error:', e);
            this.showError('Error loading video content');
        });

        // Set initial properties
        this.video.volume = this.currentVolume;
        this.video.muted = false;
    }

    setupInteractions() {
        // VR sphere interaction elements
        const playButton = document.querySelector('#playButton');
        const volumeButton = document.querySelector('#volumeButton');
        const settingsButton = document.querySelector('#settingsButton');

        if (playButton) {
            playButton.addEventListener('click', () => this.togglePlayPause());
        }

        if (volumeButton) {
            volumeButton.addEventListener('click', () => this.toggleMute());
        }

        if (settingsButton) {
            settingsButton.addEventListener('click', () => this.showSettings());
        }

        // Mouse and touch interactions
        this.scene.addEventListener('click', (e) => {
            const intersectedEl = e.detail.intersectedEl;
            if (intersectedEl && intersectedEl.classList.contains('interactive-element')) {
                this.handleInteraction(intersectedEl);
            }
        });

        // Gaze-based interaction
        this.scene.addEventListener('fusing', (e) => {
            const intersectedEl = e.detail.intersectedEl;
            if (intersectedEl && intersectedEl.classList.contains('interactive-element')) {
                intersectedEl.emit('mouseenter');
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    setupLoadingScreen() {
        const progressFill = document.querySelector('#progressFill');
        if (progressFill) {
            progressFill.style.width = '0%';
        }
    }

    checkVRSupport() {
        if (navigator.getVRDisplays || navigator.xr) {
            console.log('VR supported');
            this.showVRAvailable();
        } else {
            console.log('VR not supported');
            this.hideVRControls();
        }
    }

    // Video Controls
    togglePlayPause() {
        if (!this.video) return;

        if (this.isPlaying) {
            this.video.pause();
            this.isPlaying = false;
            this.updatePlayButton('PLAY');
        } else {
            const playPromise = this.video.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    this.isPlaying = true;
                    this.updatePlayButton('PAUSE');
                }).catch(error => {
                    console.error('Autoplay prevented:', error);
                    this.showError('Please click to start video');
                });
            }
        }
    }

    toggleMute() {
        if (!this.video) return;

        this.isMuted = !this.isMuted;
        this.video.muted = this.isMuted;
        this.updateVolumeButton();
    }

    setVolume(volume) {
        if (!this.video) return;

        this.currentVolume = Math.max(0, Math.min(1, volume));
        this.video.volume = this.currentVolume;
        
        if (this.currentVolume === 0) {
            this.isMuted = true;
            this.video.muted = true;
        } else if (this.isMuted) {
            this.isMuted = false;
            this.video.muted = false;
        }
        
        this.updateVolumeButton();
    }

    seekVideo(percentage) {
        if (!this.video || !this.video.duration) return;

        const seekTime = (percentage / 100) * this.video.duration;
        this.video.currentTime = seekTime;
    }

    // UI Updates
    updatePlayButton(text) {
        const playButtonText = document.querySelector('#playButton a-text');
        if (playButtonText) {
            playButtonText.setAttribute('value', text);
        }
    }

    updateVolumeButton() {
        const volumeText = this.isMuted ? 'MUTE' : 'VOL';
        const volumeButtonText = document.querySelector('#volumeButton a-text');
        if (volumeButtonText) {
            volumeButtonText.setAttribute('value', volumeText);
        }
    }

    updateVideoProgress() {
        if (!this.video || !this.video.duration) return;

        const progress = (this.video.currentTime / this.video.duration) * 100;
        const progressSlider = document.querySelector('#videoProgress');
        if (progressSlider) {
            progressSlider.value = progress;
        }
    }

    updateProgress(percentage) {
        const progressFill = document.querySelector('#progressFill');
        if (progressFill) {
            progressFill.style.width = percentage + '%';
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.querySelector('#loadingScreen');
        if (loadingScreen) {
            loadingScreen.style.opacity = '0';
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    showError(message) {
        console.error(message);
        // Could implement a visual error display here
        alert(message);
    }

    // VR Mode Handlers
    onEnterVR() {
        console.log('Entering VR mode');
        const uiPanel = document.querySelector('#uiPanel');
        if (uiPanel) {
            uiPanel.setAttribute('visible', true);
        }

        // Auto-start video in VR mode
        if (!this.isPlaying) {
            this.togglePlayPause();
        }
    }

    onExitVR() {
        console.log('Exiting VR mode');
        const uiPanel = document.querySelector('#uiPanel');
        if (uiPanel) {
            uiPanel.setAttribute('visible', false);
        }
    }

    showVRAvailable() {
        const enterVrBtn = document.querySelector('#enterVrBtn');
        if (enterVrBtn) {
            enterVrBtn.style.display = 'block';
            enterVrBtn.addEventListener('click', () => {
                this.scene.enterVR();
            });
        }
    }

    hideVRControls() {
        const enterVrBtn = document.querySelector('#enterVrBtn');
        if (enterVrBtn) {
            enterVrBtn.style.display = 'none';
        }
    }

    showSettings() {
        // Toggle UI panel visibility
        const uiPanel = document.querySelector('#uiPanel');
        if (uiPanel) {
            const isVisible = uiPanel.getAttribute('visible') === 'true';
            uiPanel.setAttribute('visible', !isVisible);
        }
    }

    handleInteraction(element) {
        // Add visual feedback for interactions
        element.emit('click');
        
        // Haptic feedback for VR controllers
        if (this.isVRMode && navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            for (let gamepad of gamepads) {
                if (gamepad && gamepad.hapticActuators) {
                    gamepad.hapticActuators[0].pulse(0.5, 100);
                }
            }
        }
    }

    handleKeyboard(event) {
        switch(event.code) {
            case 'Space':
                event.preventDefault();
                this.togglePlayPause();
                break;
            case 'KeyM':
                this.toggleMute();
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
            case 'KeyH':
                this.showHelp();
                break;
            case 'ArrowLeft':
                if (this.video) {
                    this.video.currentTime = Math.max(0, this.video.currentTime - 10);
                }
                break;
            case 'ArrowRight':
                if (this.video) {
                    this.video.currentTime = Math.min(this.video.duration, this.video.currentTime + 10);
                }
                break;
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    showHelp() {
        const helpModal = document.querySelector('#helpModal');
        if (helpModal) {
            helpModal.style.display = 'block';
        }
    }

    // Mobile optimization
    setupMobileOptimizations() {
        // Detect mobile device
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Optimize for mobile VR
            this.scene.setAttribute('renderer', 'antialias: false; logarithmicDepthBuffer: false;');
            
            // Enable device orientation
            if (window.DeviceOrientationEvent) {
                this.scene.setAttribute('device-orientation-permission-ui', 'enabled: true');
            }
        }
    }

    // Performance monitoring
    monitorPerformance() {
        if (this.scene.getAttribute('stats') === 'true') {
            // Performance stats are already enabled
            return;
        }

        // Monitor frame rate
        let lastTime = performance.now();
        let frameCount = 0;
        
        const checkPerformance = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                console.log('Current FPS:', fps);
                
                if (fps < 30) {
                    console.warn('Low performance detected, consider reducing quality settings');
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(checkPerformance);
        };
        
        checkPerformance();
    }
}

// Initialize the VR Experience
const vrExperience = new VRExperience();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VRExperience;
}
