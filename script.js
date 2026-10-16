(() => {
  "use strict";

  const screens = {
    welcome: document.querySelector("#welcome-screen"),
    cake: document.querySelector("#cake-screen"),
    celebration: document.querySelector("#celebration-screen"),
    gift: document.querySelector("#gift-screen"),
    letter: document.querySelector("#letter-screen"),
    final: document.querySelector("#final-screen")
  };
  const openSurpriseButton = document.querySelector("#open-surprise");
  const cakeWrap = document.querySelector("#cake-wrap");
  const countdown = document.querySelector("#countdown");
  const flames = [...document.querySelectorAll(".candle-flame .flame")];
  const smokeTrails = [...document.querySelectorAll(".candle-flame .smoke")];
  const wishMessage = document.querySelector("#wish-message");
  const giftButton = document.querySelector("#open-gift");
  const giftBox = document.querySelector("#gift-box");
  const giftHint = document.querySelector("#gift-hint");
  const giftReveal = document.querySelector("#gift-reveal");
  const openLoveNoteButton = document.querySelector("#open-love-note");
  const replayButton = document.querySelector("#replay");
  const nextToGiftButton = document.querySelector("#next-to-gift");
  const letterButton = document.querySelector("#to-final");
  const soundToggle = document.querySelector("#sound-toggle");
  const soundLabel = soundToggle.querySelector(".sound-label");
  const status = document.querySelector("#experience-status");
  const particles = document.querySelector("#celebration-particles");

  const allowedTransitions = {
    welcome: ["cake"],
    cake: ["celebration"],
    celebration: ["gift"],
    gift: ["letter"],
    letter: ["final"],
    final: ["welcome"]
  };

  let stage = "welcome";
  let timers = [];
  let audioContext = null;
  let activeNotes = [];
  let musicEnabled = true;
  let giftOpened = false;

  function later(callback, delay) {
    const timer = window.setTimeout(callback, delay);
    timers.push(timer);
  }

  function clearTimers() {
    timers.forEach(window.clearTimeout);
    timers = [];
  }

  function transitionTo(nextStage) {
    if (!allowedTransitions[stage].includes(nextStage)) return false;
    screens[stage].hidden = true;
    screens[nextStage].hidden = false;
    stage = nextStage;
    status.textContent = "";
    const heading = screens[nextStage].querySelector("h1, h2");
    if (heading) heading.focus({ preventScroll: true });
    return true;
  }

  function makeConfetti() {
    const symbols = [
      { className: "confetti", colors: ["#ed90b5", "#dfbd68", "#b79be3", "#f3a986", "#a5c8bc"] },
      { className: "balloon", colors: ["#e995b7", "#b6a0e0", "#edc36e", "#a8cec1"] },
      { className: "sparkle", colors: ["#d3a857", "#d57fa4", "#a88dcb"], text: "✦" }
    ];
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 48; index += 1) {
      const kind = symbols[Math.floor(Math.random() * symbols.length)];
      const particle = document.createElement("span");
      particle.className = kind.className;
      particle.style.left = `${Math.random() * 100}%`;
      particle.style.setProperty("--fall-duration", `${4.5 + Math.random() * 5}s`);
      particle.style.setProperty("--fall-delay", `${Math.random() * 5}s`);
      particle.style.setProperty("--drift", `${Math.round(Math.random() * 100 - 50)}px`);
      particle.style.setProperty(kind.className === "balloon" ? "--balloon-color" : "--confetti-color",
        kind.colors[Math.floor(Math.random() * kind.colors.length)]);
      if (kind.text) particle.textContent = kind.text;
      fragment.append(particle);
    }
    particles.replaceChildren(fragment);
  }

  function stopMusic() {
    activeNotes.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch (error) {
        if (error.name !== "InvalidStateError") throw error;
      }
    });
    activeNotes = [];
  }

  async function startMusic() {
    if (!musicEnabled || !audioContext || stage !== "celebration") return;
    try {
      await audioContext.resume();
      if (stage !== "celebration" || !musicEnabled) return;
      const melody = [
        [659.25, 0], [659.25, .22], [739.99, .5], [659.25, .82],
        [880, 1.12], [830.61, 1.55], [659.25, 2.05], [659.25, 2.27],
        [739.99, 2.55], [659.25, 2.87], [987.77, 3.17], [880, 3.62]
      ];
      const startAt = audioContext.currentTime + .08;
      melody.forEach(([frequency, offset]) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(.0001, startAt + offset);
        gain.gain.exponentialRampToValueAtTime(.11, startAt + offset + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, startAt + offset + .2);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(startAt + offset);
        oscillator.stop(startAt + offset + .22);
        activeNotes.push(oscillator);
      });
      activeNotes.forEach((oscillator) => oscillator.addEventListener("ended", () => {
        activeNotes = activeNotes.filter((note) => note !== oscillator);
      }, { once: true }));
    } catch (error) {
      soundToggle.setAttribute("aria-pressed", "false");
      soundToggle.setAttribute("aria-label", "Celebration music is unavailable");
      soundLabel.textContent = "Sound unavailable";
      musicEnabled = false;
      status.textContent = "The celebration is ready, but your browser could not play the music.";
      console.warn("Birthday music could not be played.", error);
    }
  }

  function startCountdown() {
    if (stage !== "cake") return;
    const numbers = ["3", "2", "1"];
    countdown.textContent = numbers[0];
    numbers.slice(1).forEach((number, index) => {
      later(() => {
        if (stage === "cake") countdown.textContent = number;
      }, (index + 1) * 1000);
    });
    later(() => {
      if (stage !== "cake") return;
      countdown.textContent = "";
      flames.forEach((candleFlame) => candleFlame.classList.add("is-out"));
      smokeTrails.forEach((smokeTrail) => smokeTrail.classList.add("is-rising"));
      later(() => {
        if (stage !== "cake") return;
        wishMessage.classList.add("is-visible");
        status.textContent = "Make a wish, my love.";
        later(showCelebration, 1900);
      }, 540);
    }, 3000);
  }

  function showCelebration() {
    if (!transitionTo("celebration")) return;
    makeConfetti();
    startMusic();
    status.textContent = "Happy 21st birthday! Continue whenever you are ready for your next surprise.";
  }

  function resetExperience() {
    clearTimers();
    stopMusic();
    if (audioContext && audioContext.state !== "closed") audioContext.close();
    audioContext = null;
    screens[stage].hidden = true;
    stage = "final";
    transitionTo("welcome");
    cakeWrap.classList.remove("is-dropping");
    flames.forEach((candleFlame) => candleFlame.classList.remove("is-out"));
    smokeTrails.forEach((smokeTrail) => smokeTrail.classList.remove("is-rising"));
    countdown.textContent = "";
    wishMessage.classList.remove("is-visible");
    giftBox.classList.remove("is-opening");
    giftButton.disabled = false;
    giftButton.hidden = false;
    giftOpened = false;
    giftHint.textContent = "Go on, pretty girl ♡";
    giftHint.hidden = false;
    giftReveal.hidden = true;
    giftReveal.classList.remove("is-visible");
    particles.replaceChildren();
    musicEnabled = true;
    soundToggle.setAttribute("aria-pressed", "true");
    soundToggle.setAttribute("aria-label", "Turn celebration music off");
    soundLabel.textContent = "Music on";
    status.textContent = "Your surprise is ready to begin again.";
    openSurpriseButton.focus();
  }

  openSurpriseButton.addEventListener("click", () => {
    if (!transitionTo("cake")) return;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) audioContext = new AudioContextClass();
    } catch (error) {
      musicEnabled = false;
      soundToggle.setAttribute("aria-pressed", "false");
      soundToggle.setAttribute("aria-label", "Celebration music is unavailable");
      soundLabel.textContent = "Sound unavailable";
      console.warn("Web Audio is unavailable in this browser.", error);
    }
    cakeWrap.classList.add("is-dropping");
    status.textContent = "Your birthday cake is on its way.";
  });

  cakeWrap.addEventListener("animationend", (event) => {
    if (event.target !== cakeWrap || !cakeWrap.classList.contains("is-dropping") || stage !== "cake") return;
    startCountdown();
  });

  giftButton.addEventListener("click", () => {
    if (stage !== "gift" || giftOpened) return;
    giftOpened = true;
    giftButton.disabled = true;
    giftBox.classList.add("is-opening");
    giftHint.textContent = "A little love, just for you…";
    status.textContent = "Opening your birthday gift.";
    later(() => {
      if (stage === "gift") {
        giftButton.hidden = true;
        giftHint.hidden = true;
        giftReveal.hidden = false;
        giftReveal.classList.add("is-visible");
        status.textContent = "A bouquet and a letter are waiting for you. Tap the letter to read it.";
        openLoveNoteButton.focus({ preventScroll: true });
      }
    }, 900);
  });

  openLoveNoteButton.addEventListener("click", () => {
    if (stage === "gift" && transitionTo("letter")) {
      status.textContent = "Your birthday letter is ready.";
      document.querySelector("#letter-title").focus({ preventScroll: true });
    }
  });

  letterButton.addEventListener("click", () => {
    if (transitionTo("final")) {
      status.textContent = "You deserve all the love in the universe. Happy birthday.";
      document.querySelector("#final-title").focus({ preventScroll: true });
    }
  });

  nextToGiftButton.addEventListener("click", () => {
    if (transitionTo("gift")) status.textContent = "Your birthday gift is ready. Tap the gift to open it.";
  });

  replayButton.addEventListener("click", resetExperience);

  soundToggle.addEventListener("click", () => {
    musicEnabled = !musicEnabled;
    soundToggle.setAttribute("aria-pressed", String(musicEnabled));
    soundToggle.setAttribute("aria-label", musicEnabled ? "Turn celebration music off" : "Turn celebration music on");
    soundLabel.textContent = musicEnabled ? "Music on" : "Music off";
    if (musicEnabled) startMusic();
    else stopMusic();
  });
})();
