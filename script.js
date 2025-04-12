import lyrics from './lyrics.js';

// Проверка поддержки ES6
const supportsES6 = (function () {
  try {
    new Function("(a = 0) => a");
    return true;
  } catch (err) {
    return false;
  }
})();

// Генератор белого шума
const Noise = (function () {
  "use strict";
  if (!supportsES6) {
    return;
  }

  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  let fadeOutTimer;

  function createNoise(track) {
    const bufferSize = 2 * audioContext.sampleRate;
    const noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    track.audioSource.buffer = noiseBuffer;
  }

  function stopNoise(track) {
    if (track.audioSource) {
      clearTimeout(fadeOutTimer);
      track.audioSource.stop();
    }
  }

  function fadeNoise(track) {
    if (track.fadeOut) {
      track.fadeOut = track.fadeOut >= 0 ? track.fadeOut : 0.5;
    } else {
      track.fadeOut = 0.5;
    }

    if (track.canFade) {
      track.gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + track.fadeOut);
      track.canFade = false;

      fadeOutTimer = setTimeout(() => {
        stopNoise(track);
      }, track.fadeOut * 1000);
    } else {
      stopNoise(track);
    }
  }

  function buildTrack(track) {
    track.audioSource = audioContext.createBufferSource();
    track.gainNode = audioContext.createGain();
    track.audioSource.connect(track.gainNode);
    track.gainNode.connect(audioContext.destination);
    track.canFade = true;
  }

  function setGain(track) {
    track.volume = track.volume >= 0 ? track.volume : 0.5;

    if (track.fadeIn) {
      track.fadeIn = track.fadeIn >= 0 ? track.fadeIn : 0.5;
    } else {
      track.fadeIn = 0.5;
    }

    track.gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    track.gainNode.gain.linearRampToValueAtTime(track.volume / 4, audioContext.currentTime + track.fadeIn / 2);
    track.gainNode.gain.linearRampToValueAtTime(track.volume, audioContext.currentTime + track.fadeIn);
  }

  function playNoise(track) {
    stopNoise(track);
    buildTrack(track);
    createNoise(track);
    setGain(track);
    track.audioSource.loop = true;
    track.audioSource.start();
  }

  return {
    play: playNoise,
    stop: stopNoise,
    fade: fadeNoise,
  };
})();

// Настройки шума для наведения
const noise = {
  volume: 0.05,
  fadeIn: 0.5,
  fadeOut: 0.5,
};

// Генерация динамического белого шума
const ctx = document.createElement("canvas").getContext("2d");
const whiteNoiseContainers = Array.from(document.getElementsByClassName('white-noise'));
const CELL_SIZE = 1;
const NOISE_DENSITY = 0.4;
const PATTERN_SIZE = { width: 100, height: 100 };
const colors = ['rgba(0, 0, 0, .1)', 'rgba(0, 0, 0, .3)', 'rgba(0, 0, 0, .5)'];

function generate() {
  ctx.canvas.width = PATTERN_SIZE.width;
  ctx.canvas.height = PATTERN_SIZE.height;

  let patterns = [];

  for (let color of colors) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = color;
    for (let x = 0; x <= ctx.canvas.width + CELL_SIZE; x += CELL_SIZE) {
      for (let y = 0; y <= ctx.canvas.height + CELL_SIZE; y += CELL_SIZE) {
        if (Math.random() <= NOISE_DENSITY) {
          ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        }
      }
    }
    patterns.push(ctx.canvas.toDataURL());
  }

  return patterns;
}

const addRule = (function (style) {
  const sheet = document.head.appendChild(style).sheet;
  return function (selector, css) {
    const propText = typeof css === "string" ? css : Object.keys(css).map(function (p) {
      return p + ":" + (p === "content" ? "'" + css[p] + "'" : css[p]);
    }).join(";");
    sheet.insertRule(selector + "{" + propText + "}", sheet.cssRules.length);
  };
})(document.createElement("style"));

whiteNoiseContainers.forEach(function () {
  const patterns = generate();

  addRule(".white-noise", {
    "background-image": 'url(' + patterns[0] + ')'
  });
  addRule('.white-noise:after', {
    "background-image": 'url(' + patterns[1] + ')'
  });
  addRule('.white-noise:before', {
    "background-image": 'url(' + patterns[2] + ')'
  });
});

// Основная логика сайта
const trackList = document.querySelectorAll("#trackList li");
const videoPlayer = document.getElementById("videoPlayer");
const lyricsText = document.getElementById("lyricsText");
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");
const topBar = document.querySelector(".top-bar");
const bottomBar = document.querySelector(".bottom-bar");
const trackListContainer = document.querySelector(".track-list");
const playerContainer = document.querySelector(".player-container");

// Инициализация текста "Манифест" по умолчанию
lyricsText.innerHTML = lyrics[0] || "Текст не найден";

// Логика для полос
let hideTimeout;

function showBars() {
  clearTimeout(hideTimeout);
  topBar.style.transform = "translateY(0)";
  bottomBar.style.transform = "translateY(0)";
}

function hideBars() {
  hideTimeout = setTimeout(() => {
    topBar.style.transform = "translateY(-100%)";
    bottomBar.style.transform = "translateY(100%)";
  }, 1000);
}

trackListContainer.addEventListener("mouseover", showBars);
trackListContainer.addEventListener("mouseout", hideBars);
playerContainer.addEventListener("mouseover", showBars);
playerContainer.addEventListener("mouseout", hideBars);

// Переключение треков
trackList.forEach(item => {
  item.addEventListener("mouseover", () => {
    if (supportsES6) {
      Noise.play(noise);
    }
  });

  item.addEventListener("mouseout", () => {
    if (supportsES6) {
      Noise.fade(noise);
    }
  });

  item.addEventListener("click", () => {
    trackList.forEach(el => el.classList.remove("active"));
    item.classList.add("active");

    const videoSrc = item.getAttribute("data-video");
    const lyricsId = item.getAttribute("data-lyrics-id");

    videoPlayer.src = videoSrc;
    lyricsText.innerHTML = lyrics[lyricsId] || "Текст не найден";

    if (document.querySelector(".tab-btn[data-tab='video']").classList.contains("active")) {
      videoPlayer.style.display = "block";
    }
  });
});

// Переключение вкладок
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(btn => btn.classList.remove("active"));
    contents.forEach(content => content.classList.remove("active"));

    tab.classList.add("active");
    const target = document.getElementById(tab.dataset.tab);
    target.classList.add("active");
  });
});

// Логика для стрелок прокрутки
document.querySelectorAll('.scroll-btn').forEach(button => {
  button.addEventListener('click', () => {
    const direction = button.dataset.scroll;
    const parent = button.parentElement;
    const scrollable = parent.querySelector('.track-list') || parent.querySelector('p');
    
    if (scrollable) {
      const scrollAmount = 100; // Прокрутка на 100px за раз
      if (direction === 'up') {
        scrollable.scrollBy({ top: -scrollAmount, behavior: 'smooth' });
      } else {
        scrollable.scrollBy({ top: scrollAmount, behavior: 'smooth' });
      }
    }
  });
});

// Обновление состояния стрелок и кастомной полосы прокрутки
function updateScrollButtons(scrollable, upButton, downButton, wrapper = null) {
  const isAtTop = scrollable.scrollTop === 0;
  const isAtBottom = scrollable.scrollHeight - scrollable.scrollTop <= scrollable.clientHeight + 1;

  upButton.disabled = isAtTop;
  downButton.disabled = isAtBottom;

  // Обновление кастомной полосы прокрутки (для .track-list)
  if (wrapper) {
    const canScroll = scrollable.scrollHeight > scrollable.clientHeight;
    const scrollbar = wrapper.querySelector('.custom-scrollbar') || document.createElement('div');
    scrollbar.className = 'custom-scrollbar';

    if (canScroll) {
      wrapper.classList.add('can-scroll');
      
      // Вычисляем высоту и позицию полосы прокрутки
      const scrollHeight = scrollable.scrollHeight;
      const clientHeight = scrollable.clientHeight;
      const scrollTop = scrollable.scrollTop;

      const thumbHeight = (clientHeight / scrollHeight) * clientHeight;
      const maxTop = clientHeight - thumbHeight;
      const scrollRatio = scrollTop / (scrollHeight - clientHeight);
      const thumbTop = scrollRatio * maxTop;

      // Применяем стили напрямую
      scrollbar.style.height = `${thumbHeight}px`;
      scrollbar.style.top = `${thumbTop}px`;
      scrollbar.style.position = 'absolute';
      scrollbar.style.left = '0';
      scrollbar.style.width = '6px';
      scrollbar.style.background = 'rgba(255, 255, 255, 0.5)';
      scrollbar.style.borderRadius = '3px';
      scrollbar.style.transition = 'background 0.3s';

      if (!wrapper.contains(scrollbar)) {
        wrapper.appendChild(scrollbar);
      }
    } else {
      wrapper.classList.remove('can-scroll');
      if (wrapper.contains(scrollbar)) {
        wrapper.removeChild(scrollbar);
      }
    }
  }
}

// Применяем для текстов песен
const lyricsContainer = document.querySelector('#lyrics p');
if (lyricsContainer) {
  const upButtonLyrics = document.querySelector('#lyrics .scroll-up');
  const downButtonLyrics = document.querySelector('#lyrics .scroll-down');
  
  lyricsContainer.addEventListener('scroll', () => {
    updateScrollButtons(lyricsContainer, upButtonLyrics, downButtonLyrics);
  });
  updateScrollButtons(lyricsContainer, upButtonLyrics, downButtonLyrics); // Инициализация
}

// Применяем для списка треков
const trackListScrollable = document.querySelector('.track-list');
if (trackListScrollable) {
  const upButtonTracks = document.querySelector('.track-list-wrapper .scroll-up');
  const downButtonTracks = document.querySelector('.track-list-wrapper .scroll-down');
  const trackListWrapper = document.querySelector('.track-list-wrapper');
  
  trackListScrollable.addEventListener('scroll', () => {
    updateScrollButtons(trackListScrollable, upButtonTracks, downButtonTracks, trackListWrapper);
  });

  // Инициализация
  updateScrollButtons(trackListScrollable, upButtonTracks, downButtonTracks, trackListWrapper);

  // Дополнительная проверка при загрузке
  window.addEventListener('load', () => {
    updateScrollButtons(trackListScrollable, upButtonTracks, downButtonTracks, trackListWrapper);
  });

  // Проверка при изменении размера окна
  window.addEventListener('resize', () => {
    updateScrollButtons(trackListScrollable, upButtonTracks, downButtonTracks, trackListWrapper);
  });
}