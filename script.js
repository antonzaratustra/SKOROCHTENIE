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
  }, 1000); // Уменьшаем задержку до 1 секунды
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