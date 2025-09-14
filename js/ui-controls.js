/**
 * UI Controls for VR 180 Experience
 * Handles overlay interface and external controls
 */

class UIControls {
    constructor() {
        this.vrExperience = null;
        this.isUIVisible = true;
        this.uiTimeout = null;
        
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupControls();
            this.setupEventListeners();
            this.setupAutoHide();
            this.setupModal();
        });
    }

    setupControls() {
        // Get references to UI elements
        this.enterVrBtn = document.querySelector('#enterVrBtn');
        this.playPauseBtn = document.querySelector('#playPauseBtn');
        this.muteBtn = document.querySelector('#muteBtn');
        this.fullscreenBtn = document.querySelector('#fullscreenBtn');
        this.helpBtn = document.querySelector('#helpBtn');
        this.videoProgress = document.querySelector('#videoProgress');
        this.volumeSlider = document.querySelector('#volumeSlider');
        this.uiOverlay = document.querySelector('#uiOverlay');

        // Wait for VR experience to be available
        const checkVRExperience = () => {
            if (window.vrExperience) {
                this.vrExperience = window.vrExperience;
                this.bindControls();
            } else {
                setTimeout(checkVRExperience, 100);
            }
        };
        checkVRExperience();
    }

    bindControls() {
        // Enter VR button
        if (this.enterVrBtn) {
            this.enterVrBtn.addEventListener('click', () => {
                const scene = document.querySelector('#vrScene');
                if (scene && scene.enterVR) {
                    scene.enterVR();
                }
            });
        }

        // Play/Pause button
        if (this.playPauseBtn) {
            this.playPauseBtn.addEventListener('click', () => {
                this.vrExperience.togglePlayPause();
                this.updatePlayPauseButton();
            });
        }

        // Mute button
        if (this.muteBtn) {
            this.muteBtn.addEventListener('click', () => {
                this.vrExperience.toggleMute();
                this.updateMuteButton();
            });
        }

        // Fullscreen button
        if (this.fullscreenBtn) {
            this.fullscreenBtn.addEventListener('click', () => {
                this.toggleFullscreen();
            });
        }

        // Help button
        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', () => {
                this.showHelpModal();
            });
        }

        // Video progress slider
        if (this.videoProgress) {
            this.videoProgress.addEventListener('input', (e) => {
                const percentage = e.target.value;
                this.vrExperience.seekVideo(percentage);
            });

            this.videoProgress.addEventListener('mousedown', () => {
                this.isDraggingProgress = true;
            });

            this.videoProgress.addEventListener('mouseup', () => {
                this.isDraggingProgress = false;
            });
        }

        // Volume slider
        if (this.volumeSlider) {
            this.volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.vrExperience.setVolume(volume);
                this.updateVolumeDisplay(volume);
            });
        }
    }

    setupEventListeners() {
        // Mouse movement to show/hide UI
        document.addEventListener('mousemove', () => {
            this.showUI();
            this.resetAutoHide();
        });

        // Touch events for mobile
        document.addEventListener('touchstart', () => {
            this.showUI();
            this.resetAutoHide();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });

        // Fullscreen change events
        document.addEventListener('fullscreenchange', () => {
            this.updateFullscreenButton();
        });

        document.addEventListener('webkitfullscreenchange', () => {
            this.updateFullscreenButton();
        });

        document.addEventListener('mozfullscreenchange', () => {
            this.updateFullscreenButton();
        });

        document.addEventListener('MSFullscreenChange', () => {
            this.updateFullscreenButton();
        });

        // Video events for UI updates
        const video = document.querySelector('#vr180Video');
        if (video) {
            video.addEventListener('play', () => {
                this.updatePlayPauseButton();
            });

            video.addEventListener('pause', () => {
                this.updatePlayPauseButton();
            });

            video.addEventListener('volumechange', () => {
                this.updateMuteButton();
                this.updateVolumeSlider();
            });

            video.addEventListener('timeupdate', () => {
                if (!this.isDraggingProgress) {
                    this.updateProgressSlider();
                }
            });
        }
    }

    setupAutoHide() {
        // Auto-hide UI after inactivity
        this.resetAutoHide();
    }

    setupModal() {
        const modal = document.querySelector('#helpModal');
        const closeBtn = document.querySelector('.close');

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideHelpModal();
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideHelpModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideHelpModal();
            }
        });
    }

    // UI Control Methods
    showUI() {
        if (this.uiOverlay) {
            this.uiOverlay.classList.remove('hidden');
            this.isUIVisible = true;
        }
    }

    hideUI() {
        if (this.uiOverlay && !this.isModalOpen()) {
            this.uiOverlay.classList.add('hidden');
            this.isUIVisible = false;
        }
    }

    resetAutoHide() {
        if (this.uiTimeout) {
            clearTimeout(this.uiTimeout);
        }

        this.uiTimeout = setTimeout(() => {
            this.hideUI();
        }, 3000); // Hide after 3 seconds of inactivity
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

    showHelpModal() {
        const modal = document.querySelector('#helpModal');
        if (modal) {
            modal.style.display = 'block';
            this.showUI(); // Keep UI visible while modal is open
        }
    }

    hideHelpModal() {
        const modal = document.querySelector('#helpModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    isModalOpen() {
        const modal = document.querySelector('#helpModal');
        return modal && modal.style.display === 'block';
    }

    // Button Updates
    updatePlayPauseButton() {
        if (!this.playPauseBtn || !this.vrExperience) return;

        const isPlaying = this.vrExperience.isPlaying;
        this.playPauseBtn.textContent = isPlaying ? '⏸️' : '▶️';
        this.playPauseBtn.setAttribute('aria-label', isPlaying ? 'Pause' : 'Play');
    }

    updateMuteButton() {
        if (!this.muteBtn || !this.vrExperience) return;

        const isMuted = this.vrExperience.isMuted;
        this.muteBtn.textContent = isMuted ? '🔇' : '🔊';
        this.muteBtn.setAttribute('aria-label', isMuted ? 'Unmute' : 'Mute');
    }

    updateFullscreenButton() {
        if (!this.fullscreenBtn) return;

        const isFullscreen = !!document.fullscreenElement;
        this.fullscreenBtn.textContent = isFullscreen ? '⛶' : '⛶';
        this.fullscreenBtn.setAttribute('aria-label', isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen');
    }

    updateProgressSlider() {
        if (!this.videoProgress || !this.vrExperience) return;

        const video = document.querySelector('#vr180Video');
        if (video && video.duration) {
            const progress = (video.currentTime / video.duration) * 100;
            this.videoProgress.value = progress;
        }
    }

    updateVolumeSlider() {
        if (!this.volumeSlider || !this.vrExperience) return;

        const video = document.querySelector('#vr180Video');
        if (video) {
            const volume = video.muted ? 0 : video.volume * 100;
            this.volumeSlider.value = volume;
        }
    }

    updateVolumeDisplay(volume) {
        // Could add a volume level indicator here
        console.log('Volume set to:', Math.round(volume * 100) + '%');
    }

    handleKeyboardShortcuts(event) {
        // Only handle shortcuts when not typing in input fields
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch(event.code) {
            case 'Space':
                event.preventDefault();
                if (this.vrExperience) {
                    this.vrExperience.togglePlayPause();
                    this.updatePlayPauseButton();
                }
                break;
            case 'KeyM':
                if (this.vrExperience) {
                    this.vrExperience.toggleMute();
                    this.updateMuteButton();
                }
                break;
            case 'KeyF':
                this.toggleFullscreen();
                break;
            case 'KeyH':
                this.showHelpModal();
                break;
            case 'Escape':
                if (document.fullscreenElement) {
                    this.toggleFullscreen();
                }
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.adjustVolume(0.1);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.adjustVolume(-0.1);
                break;
        }
    }

    adjustVolume(delta) {
        if (!this.vrExperience) return;

        const currentVolume = this.vrExperience.currentVolume;
        const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
        
        this.vrExperience.setVolume(newVolume);
        this.updateVolumeSlider();
        this.updateVolumeDisplay(newVolume);
        this.showUI();
        this.resetAutoHide();
    }

    // Mobile-specific methods
    setupMobileControls() {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        if (isMobile) {
            // Adjust UI for mobile
            if (this.uiOverlay) {
                this.uiOverlay.classList.add('mobile');
            }

            // Add touch-specific event handlers
            let touchStartY = 0;
            let touchStartX = 0;

            document.addEventListener('touchstart', (e) => {
                touchStartY = e.touches[0].clientY;
                touchStartX = e.touches[0].clientX;
            });

            document.addEventListener('touchend', (e) => {
                const touchEndY = e.changedTouches[0].clientY;
                const touchEndX = e.changedTouches[0].clientX;
                
                const deltaY = touchStartY - touchEndY;
                const deltaX = touchStartX - touchEndX;

                // Swipe gestures
                if (Math.abs(deltaY) > Math.abs(deltaX)) {
                    if (Math.abs(deltaY) > 50) {
                        if (deltaY > 0) {
                            // Swipe up - increase volume
                            this.adjustVolume(0.1);
                        } else {
                            // Swipe down - decrease volume
                            this.adjustVolume(-0.1);
                        }
                    }
                } else {
                    if (Math.abs(deltaX) > 50) {
                        if (deltaX > 0) {
                            // Swipe left - seek backward
                            const video = document.querySelector('#vr180Video');
                            if (video) {
                                video.currentTime = Math.max(0, video.currentTime - 10);
                            }
                        } else {
                            // Swipe right - seek forward
                            const video = document.querySelector('#vr180Video');
                            if (video) {
                                video.currentTime = Math.min(video.duration, video.currentTime + 10);
                            }
                        }
                    }
                }
            });
        }
    }

    // Accessibility features
    setupAccessibility() {
        // Add ARIA labels and keyboard navigation
        const buttons = document.querySelectorAll('.control-button, .vr-button');
        buttons.forEach((button, index) => {
            button.setAttribute('tabindex', index + 1);
        });

        // Add skip navigation
        const skipNav = document.createElement('a');
        skipNav.href = '#vrScene';
        skipNav.textContent = 'Skip to VR Experience';
        skipNav.className = 'skip-nav';
        skipNav.style.cssText = 'position: absolute; left: -9999px; z-index: 999;';
        
        skipNav.addEventListener('focus', () => {
            skipNav.style.left = '10px';
            skipNav.style.top = '10px';
        });
        
        skipNav.addEventListener('blur', () => {
            skipNav.style.left = '-9999px';
        });

        document.body.insertBefore(skipNav, document.body.firstChild);
    }
}

// Initialize UI Controls
const uiControls = new UIControls();

// Make it globally available
window.uiControls = uiControls;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UIControls;
}
