(() => {
  const poster = document.querySelector('[data-home-spot]');
  const player = document.querySelector('[data-home-spot-player]');
  if (!poster || !player || !player.canPlayType('video/mp4')) return;

  poster.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const videoURL = poster.href;
    event.preventDefault();
    player.hidden = false;
    poster.hidden = true;
    player.src = videoURL;
    player.focus();
    player.play()?.catch(() => {
      // Native controls remain available if the browser declines playback.
    });
  });
})();
