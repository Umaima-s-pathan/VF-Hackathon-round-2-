// Demo page controller for VR180 Round 2 + UI overlay
(function() {
  function $(sel) { return document.querySelector(sel); }
  function formatTime(s) {
    if (!isFinite(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  }

  document.addEventListener('DOMContentLoaded', () => {
    const scene = $('#aframeScene');
    const videoR1 = $('#vr180Round1');
    const videoR2 = $('#vr180Round2');
    const camera = $('#camera');

    const playBtn = $('#play-btn');
    const playToggle = $('#play-toggle');
    const rewindBtn = $('#rewind-btn');
    const forwardBtn = $('#forward-btn');
    const fullscreenBtn = $('#fullscreen-btn');
    const resetViewBtn = $('#reset-view');
    const vrModeBtn = $('#vr-mode');
    const helpBtn = $('#help-btn');

    const progressTrack = $('#progress-track');
    const progressBar = $('#progress-bar');
    const timeDisplay = $('#time-display');
    const placeholderText = $('#placeholderText');
    const vrSceneContainer = $('#vr-scene');

    const beforeAfterToggle = $('#before-after-toggle');
    const leftSphere = $('#leftSphere');
    const rightSphere = $('#rightSphere');
    const stereoRoot = $('#stereoRoot');
    const legacySphere = $('#legacySphere');

    // YouTube mode UI
    const sourceToggle = $('#source-toggle');
    const ytContainer = $('#youtubeContainer');

    // Hotspots and info panels (HTML overlay)
    const hotspots = document.querySelectorAll('.hotspot');
    const infoPanels = document.querySelectorAll('.info-panel');

    let activeVideo = videoR2; // default to Round 2 (Local mode)
    let useYouTube = false;
    let isRound2 = true;

    function bindVideoEvents(v) {
      if (!v) return;
      v.addEventListener('loadedmetadata', updateProgress);
      v.addEventListener('timeupdate', updateProgress);
      v.addEventListener('play', () => setPlayingUI(true));
      v.addEventListener('pause', () => setPlayingUI(false));
      v.addEventListener('ended', () => setPlayingUI(false));
    }

    function unbindVideoEvents(v) {
      if (!v) return;
      v.removeEventListener('loadedmetadata', updateProgress);
      v.removeEventListener('timeupdate', updateProgress);
      v.removeEventListener('play', () => setPlayingUI(true));
      v.removeEventListener('pause', () => setPlayingUI(false));
      v.removeEventListener('ended', () => setPlayingUI(false));
    }

    function updateProgress() {
      let dur = 0, cur = 0;
      if (useYouTube && window.YT_HELPER) {
        dur = window.YT_HELPER.getDuration() || 0;
        cur = window.YT_HELPER.getTime() || 0;
      } else {
        const v = activeVideo;
        dur = v.duration || 0;
        cur = v.currentTime || 0;
      }
      const pct = dur ? (cur / dur) * 100 : 0;
      progressBar.style.width = `${pct}%`;
      timeDisplay.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
    }

    function setPlayingUI(isPlaying) {
      if (playToggle) playToggle.innerHTML = isPlaying ? '<i class=\"fas fa-pause\"></i>' : '<i class=\"fas fa-play\"></i>';
      if (playBtn) playBtn.innerHTML = isPlaying ? '<i class=\"fas fa-pause\"></i> Pause Experience' : '<i class=\"fas fa-play\"></i> Play Experience';
      placeholderText && (placeholderText.style.display = isPlaying ? 'none' : 'flex');
      ytContainer && (ytContainer.style.pointerEvents = useYouTube ? 'auto' : 'none');
    }

    function ensureReady(v) {
      if (!v) return Promise.resolve();
      // iOS requires user gesture; we already gate playback by buttons
      v.muted = true; // keep muted for autoplay
      return v.play().then(() => { v.pause(); }).catch(() => {});
    }

    function applyMaterialSrc(videoId) {
      // Only used for Round 2 stereo spheres
      if (leftSphere) leftSphere.setAttribute('material', 'src', `#${videoId}`);
      if (rightSphere) rightSphere.setAttribute('material', 'src', `#${videoId}`);
    }

    function switchToVideo(nextVideo) {
      if (activeVideo === nextVideo) return;
      const wasPlaying = activeVideo && !activeVideo.paused;
      const t = activeVideo ? activeVideo.currentTime : 0;

      // Pause old, unbind
      if (activeVideo) {
        activeVideo.pause();
        unbindVideoEvents(activeVideo);
      }

      // Bind new and sync time
      activeVideo = nextVideo;
      if (!activeVideo) return;
      activeVideo.currentTime = Math.min(t, activeVideo.duration || t);
      bindVideoEvents(activeVideo);
      updateProgress();

      if (wasPlaying) {
        activeVideo.play().catch(()=>{});
      }
    }

    function togglePlay() {
      if (useYouTube && window.YT_HELPER) {
        // Toggle YouTube player
        const dur = window.YT_HELPER.getDuration();
        if (dur === 0) return;
        // Heuristic: if time not advancing, call play; else pause
        window.YT_HELPER.play();
        setPlayingUI(true);
        return;
      }
      const v = activeVideo;
      if (!v) return;
      if (v.paused) {
        const p = v.play();
        if (p && typeof p.then === 'function') {
          p.then(() => setPlayingUI(true)).catch(() => { setPlayingUI(false); });
        } else {
          setPlayingUI(true);
        }
      } else {
        v.pause();
        setPlayingUI(false);
      }
    }

    // Initialize materials to Round 2 by default
    applyMaterialSrc('vr180Round2');

    // Source toggle (Local vs YouTube)
    function setSourceMode(youtube){
      useYouTube = !!youtube;
      // Toggle A-Frame scene visibility vs YouTube overlay
      const sceneEl = $('#aframeScene');
      if (sceneEl) sceneEl.style.display = youtube ? 'none' : 'block';
      if (ytContainer) ytContainer.style.display = youtube ? 'block' : 'none';
      // Button label
      if (sourceToggle) sourceToggle.textContent = youtube ? 'Use Local' : 'Use YouTube';
    }

    document.addEventListener('app-config-ready', () => {
      const cfg = window.APP_CONFIG || {};
      if (cfg.USE_YOUTUBE) {
        setSourceMode(true);
        const vid = cfg.ROUND2_YT_VIDEO_ID || cfg.ROUND1_YT_VIDEO_ID;
        if (vid && window.YT_HELPER) {
          window.YT_HELPER.playYouTube(vid).then(()=>{ setPlayingUI(true); updateProgress(); });
        }
      } else {
        setSourceMode(false);
      }
    });

    sourceToggle && sourceToggle.addEventListener('click', async () => {
      setSourceMode(!useYouTube);
      if (useYouTube) {
        const cfg = window.APP_CONFIG || {};
        const vid = (isRound2 ? cfg.ROUND2_YT_VIDEO_ID : cfg.ROUND1_YT_VIDEO_ID) || cfg.ROUND2_YT_VIDEO_ID || cfg.ROUND1_YT_VIDEO_ID;
        if (vid && window.YT_HELPER) {
          await window.YT_HELPER.playYouTube(vid);
          setPlayingUI(true);
          updateProgress();
        } else {
          alert('Please configure ROUND1_YT_VIDEO_ID / ROUND2_YT_VIDEO_ID in config/local-config.json');
        }
      } else {
        // Switching back to Local; pause YouTube if playing
        if (window.YT_HELPER) window.YT_HELPER.pause();
        setPlayingUI(false);
      }
    });

    // Prepare videos for autoplay
    Promise.all([ensureReady(videoR1), ensureReady(videoR2)]).then(() => {
      bindVideoEvents(activeVideo);
      updateProgress();
    });

    // Before/After toggle
    if (beforeAfterToggle) {
      beforeAfterToggle.addEventListener('change', async () => {
        const r2 = beforeAfterToggle.checked;
        isRound2 = r2;
        if (useYouTube && window.APP_CONFIG) {
          const cfg = window.APP_CONFIG;
          const vid = r2 ? cfg.ROUND2_YT_VIDEO_ID : cfg.ROUND1_YT_VIDEO_ID;
          if (vid && window.YT_HELPER) {
            await window.YT_HELPER.playYouTube(vid);
            setPlayingUI(true);
            updateProgress();
          } else {
            alert('Please set ROUND1_YT_VIDEO_ID and ROUND2_YT_VIDEO_ID in config/local-config.json');
          }
          return;
        }
        const target = r2 ? videoR2 : videoR1;
        if (stereoRoot) stereoRoot.setAttribute('visible', r2);
        if (legacySphere) legacySphere.setAttribute('visible', !r2);
        if (r2) applyMaterialSrc('vr180Round2');
        switchToVideo(target);
      });
      // Default to Round 2 checked
      beforeAfterToggle.checked = true;
      if (stereoRoot) stereoRoot.setAttribute('visible', true);
      if (legacySphere) legacySphere.setAttribute('visible', false);
    }

    // Bind UI controls
    playBtn && playBtn.addEventListener('click', togglePlay);
    playToggle && playToggle.addEventListener('click', togglePlay);

    rewindBtn && rewindBtn.addEventListener('click', () => {
      if (useYouTube && window.YT_HELPER) {
        const cur = window.YT_HELPER.getTime() || 0;
        window.YT_HELPER.seekTo(Math.max(0, cur - 10));
      } else {
        const v = activeVideo;
        v.currentTime = Math.max(0, (v.currentTime || 0) - 10);
      }
      updateProgress();
    });

    forwardBtn && forwardBtn.addEventListener('click', () => {
      if (useYouTube && window.YT_HELPER) {
        const cur = window.YT_HELPER.getTime() || 0;
        const dur = window.YT_HELPER.getDuration() || 0;
        window.YT_HELPER.seekTo(Math.min(dur, cur + 10));
      } else {
        const v = activeVideo;
        const dur = v.duration || 0;
        v.currentTime = Math.min(dur, (v.currentTime || 0) + 10);
      }
      updateProgress();
    });

    fullscreenBtn && fullscreenBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        (vrSceneContainer.requestFullscreen || document.documentElement.requestFullscreen).call(vrSceneContainer);
      } else {
        document.exitFullscreen && document.exitFullscreen();
      }
    });

    resetViewBtn && resetViewBtn.addEventListener('click', () => {
      if (camera) {
        camera.setAttribute('rotation', { x: 0, y: 0, z: 0 });
      }
      infoPanels.forEach(p => p.style.display = 'none');
    });

    vrModeBtn && vrModeBtn.addEventListener('click', () => {
      if (scene && scene.enterVR) scene.enterVR();
      else alert('VR mode not supported in this browser/device.');
    });

    helpBtn && helpBtn.addEventListener('click', () => {
      alert('VR180 Round 2 Player\n\n• Toggle Round 1/2 to compare\n• Drag to look around\n• Use VR Mode in compatible browsers\n• Playback controls at bottom');
    });

    // Click to seek on progress track
    progressTrack && progressTrack.addEventListener('click', (e) => {
      const rect = progressTrack.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const ratio = x / rect.width;
      if (useYouTube && window.YT_HELPER) {
        const dur = window.YT_HELPER.getDuration() || 0;
        window.YT_HELPER.seekTo(ratio * dur);
      } else if (isFinite(activeVideo.duration)) {
        activeVideo.currentTime = ratio * activeVideo.duration;
      }
    });

    // Hotspots -> show info panels near the hotspot
    hotspots.forEach(h => {
      h.addEventListener('click', (e) => {
        e.stopPropagation();
        const infoId = h.getAttribute('data-info');
        const infoPanel = document.getElementById(infoId);
        if (!infoPanel) return;

        // Hide all first
        infoPanels.forEach(p => p.style.display = 'none');

        // Position panel
        const rect = h.getBoundingClientRect();
        const vrRect = vrSceneContainer.getBoundingClientRect();
        let leftPos = rect.left - vrRect.left + 40;
        let topPos = rect.top - vrRect.top;
        if (leftPos + 300 > vrRect.width) leftPos = vrRect.width - 320;
        if (topPos + 200 > vrRect.height) topPos = vrRect.height - 220;
        infoPanel.style.left = `${leftPos}px`;
        infoPanel.style.top = `${topPos}px`;
        infoPanel.style.display = 'block';
      });
    });

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.info-panel') && !e.target.closest('.hotspot')) {
        infoPanels.forEach(p => p.style.display = 'none');
      }
    });

    // Also wire close buttons if present
    document.querySelectorAll('.close-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = btn.closest('.info-panel');
        if (p) p.style.display = 'none';
      });
    });

    // Drag & drop support for loading a local VR180/360 MP4 (will be used as Round 1)
    function handleDropFile(file){
      if (!file || !file.type.startsWith('video/')) return;
      try {
        const url = URL.createObjectURL(file);
        // Replace Round 1 video source with the dropped file
        activeVideo.pause();
        while (videoR1.firstChild) videoR1.removeChild(videoR1.firstChild);
        videoR1.removeAttribute('src');
        videoR1.src = url;
        videoR1.load();
        applyMaterialSrc('vr180Round1');
        switchToVideo(videoR1);
        activeVideo.play().catch(()=>{});
        setPlayingUI(true);
      } catch (e) {
        console.error('Failed to load dropped file', e);
      }
    }

    const dropTarget = vrSceneContainer;
    if (dropTarget) {
      ['dragenter','dragover'].forEach(ev => dropTarget.addEventListener(ev, e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }));
      dropTarget.addEventListener('drop', e => {
        e.preventDefault();
        const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        handleDropFile(file);
      });
    }

    // Initialize UI state
    setPlayingUI(false);
    updateProgress();
  });
})();

