// Loads config/local-config.json if present and exposes window.APP_CONFIG
(function(){
  async function loadLocalConfig(){
    try {
      const res = await fetch('config/local-config.json', { cache: 'no-store' });
      if (!res.ok) return {};
      return await res.json();
    } catch (e) {
      return {};
    }
  }
  const defaults = {
    YOUTUBE_API_KEY: '',
    ROUND1_YT_VIDEO_ID: '',
    ROUND2_YT_VIDEO_ID: '',
    USE_YOUTUBE: false
  };
  loadLocalConfig().then(cfg => {
    window.APP_CONFIG = Object.assign({}, defaults, cfg || {});
    document.dispatchEvent(new CustomEvent('app-config-ready'));
  });
})();
