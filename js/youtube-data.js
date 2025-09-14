// Minimal YouTube Data API + IFrame player helpers
(function(){
  let ytPlayer = null;
  let ytAPIReady = false;
  let currentVideoId = '';
  const subs = [];

  // Called by the IFrame API
  window.onYouTubeIframeAPIReady = function() {
    ytAPIReady = true;
    subs.forEach(fn => fn());
  };

  function onYTReady(fn){
    if (ytAPIReady) fn(); else subs.push(fn);
  }

  function ensurePlayer(containerId){
    return new Promise(resolve => {
      onYTReady(() => {
        if (ytPlayer) return resolve(ytPlayer);
        ytPlayer = new YT.Player(containerId, {
          width: '100%',
          height: '100%',
          playerVars: {
            playsinline: 1,
            modestbranding: 1,
            rel: 0
          },
          events: {
            onReady: () => resolve(ytPlayer)
          }
        });
      });
    });
  }

  async function searchVideos(q, maxResults=5){
    const key = (window.APP_CONFIG||{}).YOUTUBE_API_KEY || '';
    if (!key) throw new Error('Missing YOUTUBE_API_KEY in config/local-config.json');
    const url = new URL('https://www.googleapis.com/youtube/v3/search');
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('q', q);
    url.searchParams.set('maxResults', String(maxResults));
    url.searchParams.set('key', key);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('YouTube API error');
    const data = await res.json();
    return (data.items||[]).map(it => ({
      id: it.id.videoId,
      title: it.snippet.title,
      thumb: it.snippet.thumbnails.medium.url
    }));
  }

  async function playYouTube(videoId){
    currentVideoId = videoId;
    const player = await ensurePlayer('youtubeContainer');
    player.loadVideoById(videoId);
    return player;
  }

  function pause(){ if (ytPlayer) ytPlayer.pauseVideo && ytPlayer.pauseVideo(); }
  function play(){ if (ytPlayer) ytPlayer.playVideo && ytPlayer.playVideo(); }
  function getTime(){ try { return ytPlayer ? ytPlayer.getCurrentTime() : 0; } catch { return 0; } }
  function getDuration(){ try { return ytPlayer ? ytPlayer.getDuration() : 0; } catch { return 0; } }
  function seekTo(sec){ try { ytPlayer && ytPlayer.seekTo(sec, true); } catch {}
  }

  window.YT_HELPER = { searchVideos, playYouTube, pause, play, getTime, getDuration, seekTo };
})();
