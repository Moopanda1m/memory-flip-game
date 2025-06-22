console.log("Window URL:", window.location.href);

const tg = window.Telegram.WebApp;
console.log("Telegram WebApp context:", tg.initDataUnsafe);

async function saveReferral(referrerId, telegramId) {
  try {
    const response = await fetch("/api/saveReferral", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        referral_code: referrerId,
        telegram_id: telegramId
      })
    });

    if (!response.ok) {
      console.error("Failed to save referral:", response.statusText);
    }
  } catch (error) {
    console.error("Error saving referral:", error);
  }
}

// Define and expose initializeTONConnect globally
function initializeTONConnect() {
  const tonConnectRoot = document.getElementById('ton-connect-root');
  if (!tonConnectRoot) {
    console.error('ton-connect-root element not found in DOM');
    return;
  }

  if (typeof window.TON_CONNECT_UI !== 'undefined' && typeof window.TON_CONNECT_UI.TonConnectUI !== 'undefined' && window.tonConnectLoaded) {
    try {
      const tonConnectUI = new window.TON_CONNECT_UI.TonConnectUI({
        manifestUrl: 'https://memoryflip-game-app.vercel.app/tonconnect-manifest.json',
        buttonRootId: 'ton-connect-root',
        twaReturnUrl: 'https://t.me/flipgame30bot'
      });
      // Wait for connection restoration before proceeding
      tonConnectUI.connectionRestored.then(restored => {
        if (restored) {
          console.log('Connection restored successfully. Wallet:', tonConnectUI.wallet);
        } else {
          console.log('Connection restoration failed. Check network or bridge.');
        }
        // Set up status change listener
        tonConnectUI.onStatusChange(wallet => {
          console.log('Wallet status changed:', wallet ? 'Connected' : 'Disconnected');
          const walletStatus = document.getElementById('wallet-status');
          if (wallet) {
            const shortAddress = `${wallet.account.address.slice(0, 6)}...${wallet.account.address.slice(-4)}`;
            walletStatus.textContent = `Connected: ${shortAddress}`;
          } else {
            walletStatus.textContent = 'Wallet not connected';
          }
          tonConnectRoot.classList.remove('hidden'); // Ensure button is visible after status update
        });
        console.log('TON Connect UI initialized successfully');
      }).catch(error => {
        console.error('Error during connection restoration:', error);
      });
    } catch (error) {
      console.error('TON Connect UI initialization failed:', error);
      const walletStatus = document.getElementById('wallet-status');
      walletStatus.textContent = 'Wallet connection unavailable';
    }
  } else {
    console.error('TON_CONNECT_UI.TonConnectUI is not available despite load confirmation');
  }
}

window.initializeTONConnect = initializeTONConnect;

// Ensure DOM is fully loaded before executing
document.addEventListener('DOMContentLoaded', () => {
  // Game Variables
  let lives = parseInt(localStorage.getItem('lives'), 10) || 5;
  let coins = parseInt(localStorage.getItem('coins'), 10) || 0;
  let timer = 30;
  let flippedCards = [];
  let matchedPairs = 0;
  let isGameRunning = false;
  let countdownInterval;
  let waitingInterval;
  const totalPairs = 8;
  let isRetry = false;

  // DOM Elements
  const livesDisplay = document.getElementById('lives');
  const coinsDisplay = document.getElementById('coins');
  const timerDisplay = document.getElementById('timer');
  const cardGrid = document.getElementById('cardGrid');
  const loadingScreen = document.getElementById('loading-screen');
  const gameContainer = document.getElementById('game-container');
  const loadingProgress = document.getElementById('loading-progress');
  const startScreen = document.getElementById('start-screen');
  const startButton = document.getElementById('start-button');
  const winPopup = document.getElementById('win-popup');
  const closePopupButton = document.getElementById('close-popup');
  const losePopup = document.getElementById('lose-popup');
  const continueButton = document.getElementById('continue-button');
  const nextButton = document.getElementById('next-button');
  const noLivesPopup = document.getElementById('no-lives-popup');
  const countdownTimer = document.getElementById('countdown-timer');
  const walletStatus = document.getElementById('wallet-status');
  const dailyRewardIcon = document.getElementById('daily-reward-icon');
  const dailyBonusPopup = document.getElementById('daily-bonus-popup');
  const claimBonusBtn = document.getElementById('claim-bonus-btn');
  const bonusMessage = document.getElementById('bonus-message');
  const closeBtn = document.querySelector('.close-btn');

  // Spin Wheel DOM Elements
  const spinIcon = document.getElementById('spin-icon');
  const spinWheelPopup = document.getElementById('spin-wheel-popup');
  const spinCloseBtn = spinWheelPopup?.querySelector('.close-btn');

  // Music Control
  const backgroundMusic = document.getElementById('background-music');

  // Initialize Telegram Web App
  const tg = window.Telegram.WebApp;
  tg.ready();
  tg.expand();
  tg.enableClosingConfirmation();

  // Enable Back Button
  tg.BackButton.show();
  tg.BackButton.onClick(() => {
    if (gameContainer.style.display === 'block') {
      gameContainer.style.display = 'none';
      startScreen.style.display = 'flex';
      pauseTimer();
    } else {
      tg.close();
    }
  });

  // Initialize Loading Animation
function startLoadingAnimation() {
  let loadValue = 0;
  const loadingInterval = setInterval(() => {
    if (!loadingScreen || !loadingProgress) {
      clearInterval(loadingInterval);
      console.error('Loading elements not found');
      return;
    }
    loadValue += 5;
    loadingProgress.style.width = loadValue + "%";

    if (loadValue >= 100) {
      clearInterval(loadingInterval);
      loadingScreen.style.display = "none";
      startScreen.style.display = "flex";
    }
  }, 150);
}

  startLoadingAnimation();

  // Start Button Click Event
  startButton.addEventListener("click", () => {
  playMusic();
  startScreen.style.display = "none";
  gameContainer.style.display = "block";
  document.querySelector('.bottom-nav').style.display = "flex"; // Show bottom-nav
  initGame();
  if (canClaim && dailyRewardIcon) {
    showDailyRewardPopup();
  }
});

  // Card Values
  const cardImages = [
    'public/card1.png',
    'public/card2.png',
    'public/card3.png',
    'public/card4.png',
    'public/card5.png',
    'public/card6.png',
    'public/card7.png',
    'public/card8.png'
  ];
  const cardValues = [...cardImages, ...cardImages];

  // Shuffle Function
  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // Initialize Game
  function initGame() {
    cardGrid.innerHTML = '';
    matchedPairs = 0;
    flippedCards = [];
    shuffle(cardValues);

    cardValues.forEach((imagePath) => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.innerHTML = 
        `<div class="card-inner">
          <div class="front"></div>
          <div class="back" style="background-image: url('${imagePath}');"></div>`;
      card.addEventListener('click', handleCardFlip);
      cardGrid.appendChild(card);
    });

    startTimer();
  }

  // Start Timer
  function startTimer() {
    timer = 30;
    timerDisplay.textContent = timer;
    isGameRunning = true;
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = setInterval(smartTimer, 1000);
  }

  // Pause Timer
  function pauseTimer() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
  }

  // Function to check if game tab is active
function isGameTabActive() {
  const gameContainer = document.getElementById('game-container');
  return gameContainer && gameContainer.style.display !== 'none';
}

// Modified timer function that checks if game tab is active
function smartTimer() {
  if (timer > 0 && isGameTabActive()) {
    timer--;
    timerDisplay.textContent = timer;
  } else if (timer <= 0) {
    clearInterval(countdownInterval);
    endGame(false);
  }
  // If game tab is not active, timer just waits (doesn't decrease)
}

  // Resume Timer
  function resumeTimer() {
    if (!countdownInterval && isGameRunning) {
      countdownInterval = setInterval(() => {
        if (timer > 0) {
          timer--;
          timerDisplay.textContent = timer;
        } else {
          clearInterval(countdownInterval);
          endGame(false);
        }
      }, 1000);
    }
  }

  // Handle Card Flip
  function handleCardFlip(event) {
    if (!isGameRunning) return;
    const card = event.currentTarget;

    if (card.classList.contains('flip') || flippedCards.length === 2) return;

    card.classList.add('flip');
    flippedCards.push(card);

    if (flippedCards.length === 2) {
      setTimeout(checkMatch, 800);
    }
  }

  // Check Match
  function checkMatch() {
    const [card1, card2] = flippedCards;
    const value1 = card1.querySelector('.back').style.backgroundImage;
    const value2 = card2.querySelector('.back').style.backgroundImage;

    if (value1 === value2) {
      matchedPairs++;
      coins += 50;
      coinsDisplay.textContent = coins;
      localStorage.setItem('coins', coins);

      if (matchedPairs === totalPairs) {
        coins += 500;
        coinsDisplay.textContent = coins;
        localStorage.setItem('coins', coins);
        endGame(true);
      }
    } else {
      setTimeout(() => {
        card1.classList.remove('flip');
        card2.classList.remove('flip');
      }, 500);
    }

    flippedCards = [];
  }

  // Show Win Popup
  function showWinPopup() {
    pauseTimer();
    winPopup.style.display = "flex";
  }

  // Show Lose Popup
  function showLosePopup(allowContinue = true) {
    pauseTimer();
    losePopup.style.display = "flex";
    continueButton.style.display = allowContinue ? "inline-block" : "none";
  }

  // Show No Lives Left Popup
  function showNoLivesPopup() {
    pauseTimer();
    noLivesPopup.style.display = "flex";
    const cooldownEndTime = localStorage.getItem('cooldownEndTime');
    let remainingTime = cooldownEndTime ? Math.max(0, Math.floor((Date.parse(cooldownEndTime) - Date.now()) / 1000)) : 10800;

    if (remainingTime <= 0) {
      lives = 5;
      localStorage.setItem('lives', lives);
      localStorage.removeItem('cooldownEndTime');
    } else {
      localStorage.setItem('cooldownEndTime', new Date(Date.now() + remainingTime * 1000).toISOString());
    }

    countdownTimer.textContent = formatTime(remainingTime);

    waitingInterval = setInterval(() => {
      remainingTime--;
      countdownTimer.textContent = formatTime(remainingTime);
      localStorage.setItem('cooldownEndTime', new Date(Date.now() + remainingTime * 1000).toISOString());

      if (remainingTime <= 0) {
        clearInterval(waitingInterval);
        noLivesPopup.style.display = "none";
        lives = 5;
        livesDisplay.textContent = lives;
        localStorage.setItem('lives', lives);
        localStorage.removeItem('cooldownEndTime');
        coins = parseInt(localStorage.getItem('coins'), 10) || 0;
        coinsDisplay.textContent = coins;
        initGame();
      }
    }, 1000);
  }

  // Format time in HH:MM:SS format
  function formatTime(seconds) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(seconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  // End Game
  function endGame(win) {
    isGameRunning = false;
    pauseTimer();
    if (win) {
      showWinPopup();
    } else {
      showLosePopup(!isRetry);
    }
  }

  // Close Popup Button Click Event
  closePopupButton.addEventListener("click", () => {
    winPopup.style.display = "none";
    lives--;
    livesDisplay.textContent = lives;
    localStorage.setItem('lives', lives);
    localStorage.setItem('lastLivesUpdate', new Date().toISOString());
    coins = parseInt(localStorage.getItem('coins'), 10) || 0;
    coinsDisplay.textContent = coins;
    isRetry = false;
    if (lives > 0) {
      initGame();
    } else {
      showNoLivesPopup();
    }
  });

  // Continue Button Click Event
  continueButton.addEventListener("click", () => {
    losePopup.style.display = "none";
    isRetry = true;
    show_9069289().then(() => {
      initGame();
      resumeTimer();
    }).catch(() => {
      isRetry = false;
      lives--;
      livesDisplay.textContent = lives;
      localStorage.setItem('lives', lives);
      localStorage.setItem('lastLivesUpdate', new Date().toISOString());
      if (lives > 0) {
        initGame();
      } else {
        showNoLivesPopup();
      }
    });
  });

  // Next Button Click Event
  nextButton.addEventListener("click", () => {
    losePopup.style.display = "none";
    lives--;
    livesDisplay.textContent = lives;
    localStorage.setItem('lives', lives);
    localStorage.setItem('lastLivesUpdate', new Date().toISOString());
    isRetry = false;
    if (lives > 0) {
      initGame();
    } else {
      showNoLivesPopup();
    }
  });

  // On Load, Restore Coins and Lives with Regeneration
  window.addEventListener('load', () => {
    coins = parseInt(localStorage.getItem('coins'), 10) || 0;
    coinsDisplay.textContent = coins;
    lives = parseInt(localStorage.getItem('lives'), 10) || 5;
    livesDisplay.textContent = lives;
    const cooldownEndTime = localStorage.getItem('cooldownEndTime');
    if (cooldownEndTime && Date.now() < Date.parse(cooldownEndTime)) {
      showNoLivesPopup();
    } else {
      const lastUpdate = localStorage.getItem('lastLivesUpdate');
      if (lastUpdate) {
        const timeElapsed = (Date.now() - Date.parse(lastUpdate)) / 1000;
        const regenInterval = 36 * 60;
        const livesToAdd = Math.floor(timeElapsed / regenInterval);
        lives = Math.min(5, lives + livesToAdd);
        localStorage.setItem('lives', lives);
        localStorage.setItem('lastLivesUpdate', new Date().toISOString());
        livesDisplay.textContent = lives;
      }
    }
  });

  // Daily Reward System
  let currentDay = parseInt(localStorage.getItem('dailyRewardDay') || '0');
  let lastClaimDate = localStorage.getItem('lastDailyReward');
  let canClaim = false;
  const rewardAmounts = [250, 500, 600, 700, 800, 900, 1000];
  const WAIT_PERIOD = 86400000; // 24 hours
  const CLAIM_WINDOW = 86400000; // 24 hours

  function checkDailyRewardEligibility() {
    const now = new Date();
    if (!lastClaimDate) {
      canClaim = true;
      return;
    }
    const lastClaim = new Date(lastClaimDate);
    const timeDiff = now - lastClaim;

    // After 24 hours, allow claiming within the next 24 hours
    if (timeDiff >= WAIT_PERIOD && timeDiff < WAIT_PERIOD + CLAIM_WINDOW) {
      canClaim = true;
    }
    // If more than 48 hours have passed, reset to Day 1
    else if (timeDiff >= WAIT_PERIOD + CLAIM_WINDOW) {
      canClaim = true;
      currentDay = 0;
      localStorage.setItem('dailyRewardDay', currentDay);
    }
    // Before 24 hours, cannot claim
    else {
      canClaim = false;
    }
    updateNotificationBadge();
  }

  function updateNotificationBadge() {
    const existingBadge = document.querySelector('.notification-badge');
    if (existingBadge) existingBadge.remove();
    if (canClaim) {
      const badge = document.createElement('div');
      badge.className = 'notification-badge';
      badge.innerHTML = '!';
      dailyRewardIcon.parentNode.appendChild(badge);
    }
  }

  function showDailyRewardPopup() {
    pauseTimer();
    dailyBonusPopup.style.display = 'flex';
    updateDailyRewardUI();
  }

  function updateDailyRewardUI() {
    for (let i = 1; i <= 7; i++) {
      const dayCard = document.getElementById(`day${i}`);
      dayCard.classList.remove('active', 'claimed');
    }
    for (let i = 0; i < currentDay; i++) {
      const dayCard = document.getElementById(`day${i + 1}`);
      if (dayCard) dayCard.classList.add('claimed');
    }
    const activeDay = document.getElementById(`day${currentDay + 1}`);
    if (activeDay) activeDay.classList.add('active');
    if (canClaim) {
      claimBonusBtn.disabled = false;
      const nextReward = rewardAmounts[currentDay];
      bonusMessage.textContent = `Claim your Day ${currentDay + 1} reward of ${nextReward} coins!`;
    } else {
      claimBonusBtn.disabled = true;
      bonusMessage.textContent = `Come back every day for new rewards!`;
    }
  }

  function claimDailyReward() {
    if (!canClaim) return;
    const rewardAmount = rewardAmounts[currentDay];
    coins += rewardAmount;
    localStorage.setItem('coins', coins);
    coinsDisplay.textContent = coins;
    currentDay = (currentDay + 1) % 7; // Increment day, reset to 0 after Day 7
    localStorage.setItem('dailyRewardDay', currentDay);
    const now = new Date();
    localStorage.setItem('lastDailyReward', now.toISOString());
    const claimedDay = document.getElementById(`day${currentDay}`);
    if (claimedDay) claimedDay.classList.add('claimed');
    bonusMessage.textContent = `Reward claimed: +${rewardAmount} coins! Come back tomorrow.`;
    claimBonusBtn.disabled = true;
    canClaim = false;
    const badge = document.querySelector('.notification-badge');
    if (badge) badge.remove();
    setTimeout(() => {
      dailyBonusPopup.style.display = 'none';
      resumeTimer();
    }, 2000);
  }

  if (dailyRewardIcon) {
    dailyRewardIcon.addEventListener('click', showDailyRewardPopup);
  }
  if (claimBonusBtn) {
    claimBonusBtn.addEventListener('click', claimDailyReward);
  }
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      dailyBonusPopup.style.display = 'none';
      resumeTimer();
    });
  }

  checkDailyRewardEligibility();

  // Music Functions
  function playMusic() {
    if (backgroundMusic) {
      backgroundMusic.volume = 0.05; // Set to 5% volume to avoid being too loud
      backgroundMusic.loop = true; // Enable looping
      backgroundMusic.play().catch(error => {
        console.log('Autoplay blocked by browser, music will play on user interaction:', error);
      });
    }
  }

  function pauseMusic() {
    if (backgroundMusic) {
      backgroundMusic.pause();
    }
  }

  // Start music on first user interaction
  startButton.addEventListener("click", () => {
    playMusic(); // Ensure music plays on first interaction
    startScreen.style.display = "none";
    gameContainer.style.display = "block";
    initGame();
    if (canClaim && dailyRewardIcon) {
      showDailyRewardPopup();
    }
  });

  // Do not pause music on popup open, only monitor for potential future needs
  [winPopup, losePopup, noLivesPopup, dailyBonusPopup].forEach(popup => {
    popup.addEventListener('transitionend', (e) => {
      if (!popup.style.display || popup.style.display === 'none') {
        // No pause action, music continues playing
      }
    });
  });

  // Spin Wheel Functionality
  function initializeSpinWheel() {
    const canvas = document.getElementById("wheelCanvas");
    const ctx = canvas.getContext("2d");
    const confettiCanvas = document.getElementById("confettiCanvas");
    const confettiCtx = confettiCanvas.getContext("2d");

    const segments = [
      "+100 Coins", "Better Luck", "+1000 Coins", "+200 Coins",
      "+10 Coins", "Better Luck", "+500 Coins", "+50 Coins"
    ];

    const colors = [
      "#4CAF50", // green
      "#FFC107", // amber
      "#03A9F4", // sky blue
      "#FF5722", // deep orange
      "#9C27B0", // purple
      "#00BCD4", // cyan
      "#8BC34A", // light green
      "#FF9800"  // orange
    ];

    const spinBtn = document.getElementById("spinBtn");
    const adBtn = document.getElementById("adBtn");
    const message = document.getElementById("message");
    const spinWinPopup = document.getElementById("spinWinPopup");
    const spinWinMessage = document.getElementById("spinWinMessage");
   const spinClosePopup = spinWinPopup?.querySelector(".close-popup-btn");
    const spinPopupContent = spinWinPopup?.querySelector(".spin-popup-content");

    const anglePerSegment = 360 / segments.length;
    let rotation = 0;
    let isSpinning = false;
    let spinsLeft = 1;
    const SPIN_KEY = "lastSpinTime";
    const AD_VIEWS_KEY = "adViews";
    const COOLDOWN = 86400000; // 1 minute for testing (can change to 86400000 for 24 hours)
    const MAX_AD_VIEWS = 3;

    // Confetti animation
    let particles = [];

    function createParticle() {
      return {
        x: Math.random() * confettiCanvas.width,
        y: -10, // Start above canvas
        size: Math.random() * 10 + 5,
        speedX: Math.random() * 6 - 3, // -3 to 3
        speedY: Math.random() * 5 + 2, // 2 to 7
        color: ['#FFD700', '#FF4500', '#00FF00', '#1E90FF'][Math.floor(Math.random() * 4)],
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5 // -5 to 5
      };
    }

    function triggerConfetti() {
      confettiCanvas.width = spinWheelPopup.offsetWidth;
      confettiCanvas.height = spinWheelPopup.offsetHeight;
      confettiCanvas.style.display = "block";

      particles = Array.from({ length: 100 }, createParticle);

      function animateConfetti() {
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
        particles.forEach((particle, index) => {
          particle.x += particle.speedX;
          particle.y += particle.speedY;
          particle.rotation += particle.rotationSpeed;
          particle.speedY += 0.1; // Gravity

          if (particle.y > confettiCanvas.height + particle.size) {
            particles.splice(index, 1);
            return;
          }

          confettiCtx.save();
          confettiCtx.translate(particle.x, particle.y);
          confettiCtx.rotate((particle.rotation * Math.PI) / 180);
          confettiCtx.fillStyle = particle.color;
          confettiCtx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
          confettiCtx.restore();
        });

        if (particles.length > 0) {
          requestAnimationFrame(animateConfetti);
        } else {
          confettiCanvas.style.display = "none";
        }
      }

      animateConfetti();
    }

    function formatSpinTime(ms) {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function startCooldownTimer(lastSpin) {
      message.classList.add("timer");
      const updateTimer = () => {
        const elapsed = Date.now() - lastSpin;
        const remaining = Math.max(0, COOLDOWN - elapsed);
        message.textContent = formatSpinTime(remaining);
        if (remaining > 0) {
          setTimeout(updateTimer, 1000);
        } else {
          spinsLeft = 1;
          localStorage.setItem(AD_VIEWS_KEY, "0");
          spinBtn.disabled = false;
          adBtn.style.display = "none";
          message.textContent = "";
          message.classList.remove("timer");
        }
      };
      updateTimer();
    }

    function drawWheel() {
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = canvas.width / 2 - 20; // Adjust radius for smaller canvas

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation - Math.PI / 2); // Rotate so 0° is at the top

      for (let i = 0; i < segments.length; i++) {
        const angle = i * (2 * Math.PI / segments.length);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.fillStyle = colors[i];
        ctx.arc(0, 0, radius, angle, angle + (2 * Math.PI / segments.length));
        ctx.fill();
        ctx.strokeStyle = "#333333";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.rotate(angle + (Math.PI / segments.length));
        ctx.fillStyle = "#fff";
        ctx.font = "bold 14px sans-serif"; // Smaller font for smaller canvas
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 3;
        ctx.fillText(segments[i], radius - 15, 0);
        ctx.restore();
      }

      ctx.restore();
    }

    function animateSpin(targetRotation, callback) {
      const duration = 5000;
      const start = performance.now();
      const initialRotation = rotation;

      function animate(time) {
        const elapsed = time - start;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 4);
        rotation = initialRotation + (targetRotation - initialRotation) * easeOut;
        drawWheel();
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          callback();
        }
      }

      requestAnimationFrame(animate);
    }

    function getWinningSegment() {
      const degrees = (rotation * 180 / Math.PI) % 360;
      const normalizedDegrees = (360 - degrees) % 360;
      const index = Math.floor(normalizedDegrees / anglePerSegment) % segments.length;
      return segments[index];
    }

    function handleSpin() {
      if (isSpinning || spinsLeft <= 0) return;

      isSpinning = true;
      spinsLeft--;
      const lastSpinTime = Date.now();
      localStorage.setItem(SPIN_KEY, lastSpinTime.toString());

      const adViews = parseInt(localStorage.getItem(AD_VIEWS_KEY) || "0");
      if (spinsLeft === 0 && adViews < MAX_AD_VIEWS) {
        adBtn.style.display = "inline-block";
      } else if (spinsLeft === 0 && adViews >= MAX_AD_VIEWS) {
        startCooldownTimer(lastSpinTime);
      }

      const targetRotation = rotation + Math.PI * 10 + Math.random() * 2 * Math.PI;
      animateSpin(targetRotation, () => {
        const result = getWinningSegment();
        spinWinMessage.textContent = `You got: ${result}`;
        if (result.includes("Coins")) {
          spinPopupContent.classList.remove("better-luck");
          setTimeout(triggerConfetti, 50);
          // Update game coins
          const coinAmount = parseInt(result.match(/\d+/)[0]);
          coins += coinAmount;
          coinsDisplay.textContent = coins;
          localStorage.setItem('coins', coins);
        } else {
          spinPopupContent.classList.add("better-luck");
        }
        spinWinPopup.style.display = "flex";
        isSpinning = false;
        if (spinsLeft <= 0) spinBtn.disabled = true;
      });
    }

    function handleAdWatch() {
      message.textContent = "Watching ad...";
      adBtn.disabled = true;
      show_9069289().then(() => {
        spinsLeft = 1;
        const adViews = parseInt(localStorage.getItem(AD_VIEWS_KEY) || "0") + 1;
        localStorage.setItem(AD_VIEWS_KEY, adViews.toString());
        spinBtn.disabled = false;
        adBtn.style.display = "none";
        adBtn.disabled = false;
        message.textContent = "You got 1 extra spin!";
        message.classList.remove("timer");
      }).catch(() => {
        adBtn.disabled = false;
        message.textContent = "Ad failed, try again.";
      });
    }

    function loadSpinState() {
      const lastSpin = parseInt(localStorage.getItem(SPIN_KEY));
      let adViews = parseInt(localStorage.getItem(AD_VIEWS_KEY) || "0");

      if (lastSpin) {
        const elapsed = Date.now() - lastSpin;
        if (elapsed < COOLDOWN) {
          spinsLeft = adViews >= MAX_AD_VIEWS ? 0 : 1;
          if (spinsLeft === 0) {
            spinBtn.disabled = true;
            if (adViews >= MAX_AD_VIEWS) {
              startCooldownTimer(lastSpin);
            } else {
              adBtn.style.display = "inline-block";
            }
          } else if (adViews < MAX_AD_VIEWS) {
            adBtn.style.display = "inline-block";
          }
        } else {
          spinsLeft = 1;
          adViews = 0;
          localStorage.setItem(AD_VIEWS_KEY, "0");
          spinBtn.disabled = false;
          adBtn.style.display = "none";
          message.textContent = "";
          message.classList.remove("timer");
        }
      }
    }

    // Event Listeners for Spin Wheel
    if (spinBtn) {
      spinBtn.addEventListener("click", handleSpin);
    }
    if (adBtn) {
      adBtn.addEventListener("click", handleAdWatch);
    }
    if (spinClosePopup) {
      spinClosePopup.addEventListener("click", () => {
        spinWinPopup.style.display = "none";
        spinPopupContent.classList.remove("better-luck");
        confettiCanvas.style.display = "none";
        particles = [];
      });
    }

    // Draw initial wheel
    drawWheel();
    loadSpinState();
  }

  // Show Spin Wheel Popup
  function showSpinWheelPopup() {
    pauseTimer();
    spinWheelPopup.style.display = 'flex';
    initializeSpinWheel(); // Initialize wheel when popup is shown
  }

  // Spin Icon Click Event
  if (spinIcon) {
    spinIcon.addEventListener('click', showSpinWheelPopup);
  }

  // Spin Wheel Popup Close Button
  if (spinCloseBtn) {
    spinCloseBtn.addEventListener('click', () => {
      spinWheelPopup.style.display = 'none';
      resumeTimer();
    });
  }
});

// Bottom Navigation Tab Switching
document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
  item.addEventListener('click', () => {
    // Toggle active class
    document.querySelectorAll('.bottom-nav .nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');

    // Get the target tab
    const tab = item.getAttribute('data-tab');

    // Hide all containers
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('referral-container').style.display = 'none';
    document.getElementById('staking-container').style.display = 'none';
    document.getElementById('task-container').style.display = 'none';
    document.getElementById('airdrop-container').style.display = 'none';

    // Show bottom-nav
    document.querySelector('.bottom-nav').style.display = 'flex';

    // Show the corresponding container
    if (tab === 'home') {
      document.getElementById('game-container').style.display = 'block';
    } else if (tab === 'referral') {
      document.getElementById('referral-container').style.display = 'block';
    } else if (tab === 'staking') {
      document.getElementById('staking-container').style.display = 'block';
    } else if (tab === 'task') {
      document.getElementById('task-container').style.display = 'block';
    } else if (tab === 'airdrop') {
      document.getElementById('airdrop-container').style.display = 'block';
    }
  });
});

// Referral System
function getUserId() {
  const tg = window.Telegram.WebApp;
  return tg.initDataUnsafe.user ? tg.initDataUnsafe.user.id : 'user_' + Math.random().toString(36).substr(2, 9);
}

function getUsername() {
  const tg = window.Telegram.WebApp;
  return tg.initDataUnsafe.user ? (tg.initDataUnsafe.user.username || tg.initDataUnsafe.user.first_name || 'User_' + getUserId()) : 'User_' + getUserId();
}

function generateReferralLink() {
  const userId = getUserId();
  return `https://t.me/flipgame30bot?start=rngs_${userId}`;
}

function handleInvite() {
  const card = event.currentTarget;
  const ripple = document.createElement('div');
  const rect = card.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const x = event.clientX - rect.left - size / 2;
  const y = event.clientY - rect.top - size / 2;

  ripple.className = 'ripple';
  ripple.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    left: ${x}px;
    top: ${y}px;
  `;

  card.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);

  handleMainInvite(); // Trigger sharing on card click
}

function handleMainInvite() {
  const link = generateReferralLink();
  const tg = window.Telegram.WebApp;
  const shareText = `Join me on Memory Card Game and earn 2000 coins! 🎮 ${link}`;
  tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(shareText)}`);
  showNotification('Opening share options...');
}

function refreshFriends() {
  const refreshBtn = event.currentTarget;
  const svg = refreshBtn.querySelector('svg');

  svg.style.transform = 'rotate(360deg)';
  svg.style.transition = 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';

  setTimeout(() => {
    svg.style.transform = 'rotate(0deg)';
    displayReferredUsers();
    showNotification('Network refreshed');
  }, 500);
}

function showNotification(message) {
  const notification = document.createElement('div');
  notification.className = 'notification';
  notification.textContent = message;
  notification.style.animation = 'slideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards';
    setTimeout(() => notification.remove(), 400);
  }, 2500);
}

async function displayReferredUsers() {
  const tg = window.Telegram.WebApp;
  const userId = tg.initDataUnsafe?.user?.id?.toString();
  const friendsList = document.getElementById("friends-list");
  if (!friendsList || !userId) return;

  friendsList.innerHTML = ""; // Clear UI

  const referralKey = `referral_done_for_${userId}`;
  if (localStorage.getItem(referralKey)) {
    const refMsg = document.createElement("div");
    refMsg.className = "referral-box";
    refMsg.textContent = "✅ You joined with a referral and earned +2000 $PANDA!";
    friendsList.appendChild(refMsg);
  }

  // Step 2: Fetch referrals sent by this user
  try {
    const response = await fetch(`https://vwvmjzapwmruihtyqfkl.supabase.co/rest/v1/referrals?referral_code=eq.${userId}`, {
      headers: {
        apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ',
        Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ'
      }
    });

    if (response.ok) {
      const referrals = await response.json();

      if (referrals.length > 0) {
        referrals.forEach(r => {
          const el = document.createElement("div");
          el.className = "friend-item";
          el.textContent = `👤 User ${r.telegram_id}`;
          friendsList.appendChild(el);
        });

        // ✅ Reward User A here
        const rewardGivenKey = `referral_reward_given_for_${userId}`;
        if (!localStorage.getItem(rewardGivenKey)) {
          const reward = referrals.length * 2000;
          let userCoins = parseInt(localStorage.getItem("coins") || "0", 10);
          userCoins += reward;
          localStorage.setItem("coins", userCoins);
          localStorage.setItem(rewardGivenKey, "true");

          // Update UI
          document.querySelectorAll('[data-coin-display], #coins').forEach(el => {
            if (el) el.textContent = userCoins;
          });

          showNotification(`🎁 You earned ${reward} coins from referrals!`);
        }

      } else {
        friendsList.innerHTML += `<div class="no-referral">No invites sent yet.</div>`;
      }
    } else {
      friendsList.innerHTML += `<div class="no-referral">Could not fetch data.</div>`;
    }

  } catch (err) {
    console.error("Could not load referral list:", err);
  }
}

// Function to update User A's coin balance in Supabase and show it locally
async function rewardAndRefreshUserA(referralCode) {
  try {
    // Fetch the most recent referral entry for the given referral code
    const response = await fetch(
      `https://vwvmjzapwmruihtyqfkl.supabase.co/rest/v1/referrals?referral_code=eq.${referralCode}&order=timestamp.desc&limit=1`,
      {
        headers: {
          apikey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ',
          Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3dm1qemFwd21ydWlodHlxZmtsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MDA0MTQsImV4cCI6MjA2NTM3NjQxNH0.dYyCHMytotTyUMnZajeFccJYpU5uMybC3RuSpjVMIpQ'
        }
      }
    );

    if (!response.ok) throw new Error("Failed to fetch User A");

    const data = await response.json();
    const userA = data[0];

    if (!userA || !userA.telegram_id) {
      console.warn("No User A found for this referral code");
      return;
    }

    const currentBalance = parseInt(userA.coins || "0", 10);
    const updatedBalance = currentBalance + 2000;

    await fetch(
      `https://vwvmjzapwmruihtyqfkl.supabase.co/rest/v1/referrals?id=eq.${userA.id}`,
      {
        method: "PATCH",
        headers: {
          apikey: 'YOUR_SUPABASE_API_KEY',
          Authorization: 'Bearer YOUR_SUPABASE_API_KEY',
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ coins: updatedBalance })
      }
    );

    console.log(`✅ User A (${userA.telegram_id}) rewarded with 2000 coins`);

    // If the current user is User A, update their UI
    const tg = window.Telegram.WebApp;
    const userId = tg.initDataUnsafe?.user?.id?.toString();

    if (userId === userA.telegram_id) {
      localStorage.setItem("coins", updatedBalance);
      document.querySelectorAll('[data-coin-display], #coins').forEach(el => {
        if (el) el.textContent = updatedBalance;
      });
      showNotification("🎉 You earned 2000 coins from a referral!");
    }

  } catch (err) {
    console.error("❌ Failed to reward User A:", err);
  }
}


async function handleReferral() {
  const tg = window.Telegram.WebApp;
  const userId = tg.initDataUnsafe?.user?.id?.toString();
  const urlParams = new URLSearchParams(window.location.search);
  const referralCode = urlParams.get('start') || tg.initDataUnsafe?.start_param;
  const referralKey = `referral_done_for_${userId}`;

  // ✅ Reject invalid referrals (like App Center junk)
  if (!userId || !referralCode || localStorage.getItem(referralKey) || !referralCode.startsWith("rngs_")) {
    displayReferredUsers();
    return;
  }

  try {
    await saveReferral(referralCode, userId); // Store in Supabase

    // Give 2000 coins to User B (current user)
    let userCoins = parseInt(localStorage.getItem("coins") || "0", 10);
    userCoins += 2000;
    localStorage.setItem("coins", userCoins);
    localStorage.setItem(referralKey, "true");

    document.querySelectorAll('[data-coin-display], #coins').forEach(el => {
      if (el) el.textContent = userCoins;
    });

    showNotification("🎉 You earned 2000 coins for joining via referral!");

    // Reward User A and update balance
    await rewardAndRefreshUserA(referralCode);

  } catch (err) {
    console.error("Referral saving failed:", err);
  }

  displayReferredUsers();
}


async function saveReferral(referral_code, telegram_id) {
  return await fetch("/api/saveReferral", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ referral_code, telegram_id })
  });
}


// Staking Section
let selectedPeriod = { days: 28, apy: 0.12 };
let availableBalance = parseInt(localStorage.getItem('coins') || '0', 10);
let adWatched = false;

function updateCoinDisplays() {
  // For staking section (keep with "Coins")
  document.getElementById('available-balance').textContent = `${availableBalance} Coins`;

  // For main UI (just number, no "Coins")
  const globalDisplays = document.querySelectorAll('[data-coin-display], #coins');
  globalDisplays.forEach(el => el.textContent = `${availableBalance}`);
}

// Handle staking period selection
document.querySelectorAll('.staking-card').forEach(card => {
  card.addEventListener('click', function () {
    document.querySelectorAll('.staking-card').forEach(c => c.classList.remove('selected'));
    this.classList.add('selected');

    selectedPeriod.days = parseInt(this.dataset.days);
    selectedPeriod.apy = parseFloat(this.dataset.apy);
    adWatched = false;
    calculateEstimatedRewards();
  });
});

// Max stake
document.getElementById('max-stake-btn').addEventListener('click', () => {
  document.getElementById('stakeAmount').value = availableBalance;
  calculateEstimatedRewards();
});

// Estimate rewards
function calculateEstimatedRewards() {
  const amount = parseInt(document.getElementById('stakeAmount').value, 10) || 0;
  if (amount <= 0) {
    document.getElementById('estimatedRewards').textContent = '~ 0';
    return;
  }
  const apy = adWatched ? selectedPeriod.apy * 2 : selectedPeriod.apy;
  const reward = Math.round(amount * apy);
  document.getElementById('estimatedRewards').textContent = `~ ${reward}`;
}

// Stake Now logic
document.getElementById('stake-now-btn').addEventListener('click', () => {
  const amount = parseInt(document.getElementById('stakeAmount').value, 10);
  if (!amount || amount <= 0) return alert('Please enter a valid amount to stake');
  if (amount > availableBalance) return alert('Insufficient balance');

  const finalAPY = selectedPeriod.apy * (adWatched ? 2 : 1);
  const reward = Math.round(amount * finalAPY);
  const totalReturn = amount + reward;

  alert(`Successfully staked ${amount} tokens for ${selectedPeriod.days} days at ${finalAPY * 100}% APY!`);

  availableBalance -= amount;
  localStorage.setItem('coins', availableBalance);
  updateCoinDisplays();
  calculateEstimatedRewards();

// Countdown based on selected staking duration
let secondsLeft = selectedPeriod.days * 24 * 60 * 60;
localStorage.setItem('stakingEnd', Date.now() + secondsLeft * 1000);
localStorage.setItem('stakedAmount', amount);
localStorage.setItem('stakedReward', reward);
startCountdown(secondsLeft);


  const countdown = setInterval(() => {
    secondsLeft--;
    if (timerDisplay) timerDisplay.textContent = `Staking ends in: ${secondsLeft}s`;
    if (secondsLeft <= 0) {
      clearInterval(countdown);
      if (timerDisplay) timerDisplay.textContent = '';

      alert(`🎉 Your staking has matured!\nYou earned ${reward} coins.\nReturning your ${amount} coins too.`);

      availableBalance += totalReturn;
      localStorage.setItem('coins', availableBalance);
      updateCoinDisplays();
      calculateEstimatedRewards();
      adWatched = false;
    }
  }, 1000);
});

// Ad logic
document.getElementById('watch-ad-btn').addEventListener('click', () => {
  show_9425084().then(() => {
    adWatched = true;

    const amount = parseInt(document.getElementById('stakeAmount').value, 10);
    if (!amount || amount <= 0) return alert('Please enter a valid amount to stake');
    if (amount > availableBalance) return alert('Insufficient balance');

    const finalAPY = selectedPeriod.apy * 2; // double APY
    const reward = Math.round(amount * finalAPY);
    const totalReturn = amount + reward;

    alert(`✅ Ad watched! You’ve staked ${amount} for ${selectedPeriod.days} days at 2x APY!\nEstimated reward: ${reward} coins.`);

    availableBalance -= amount;
    localStorage.setItem('coins', availableBalance);
    updateCoinDisplays();
    calculateEstimatedRewards();

    // Start countdown immediately based on selected staking duration
let secondsLeft = selectedPeriod.days * 24 * 60 * 60;
localStorage.setItem('stakingEnd', Date.now() + secondsLeft * 1000);
localStorage.setItem('stakedAmount', amount);
localStorage.setItem('stakedReward', reward);
startCountdown(secondsLeft);
  }).catch(() => {
    alert('❌ Ad was not completed. No bonus applied.');
  });
});


// Initial
updateCoinDisplays();
calculateEstimatedRewards();

function startCountdown(secondsLeft) {
  setStakeUIState(true); // Disable UI on start
  const timerDisplay = document.getElementById('countdown-timer');
  if (timerDisplay) timerDisplay.textContent = `Staking ends in: ${formatDuration(secondsLeft)}`;


  const countdown = setInterval(() => {
    secondsLeft--;
    if (timerDisplay) timerDisplay.textContent = `Staking ends in: ${formatDuration(secondsLeft)}`;

    if (secondsLeft <= 0) {
      clearInterval(countdown);
      if (timerDisplay) timerDisplay.textContent = '';

      // Retrieve values
      const amount = parseInt(localStorage.getItem('stakedAmount'), 10) || 0;
      const reward = parseInt(localStorage.getItem('stakedReward'), 10) || 0;
      const totalReturn = amount + reward;

      alert(`🎉 Your staking has matured!\nYou earned ${reward} coins.\nReturning your ${amount} coins too.`);

      availableBalance += totalReturn;
      localStorage.setItem('coins', availableBalance);

      // Cleanup
      localStorage.removeItem('stakingEnd');
      localStorage.removeItem('stakedAmount');
      localStorage.removeItem('stakedReward');

      setStakeUIState(false); // Re-enable UI
      updateCoinDisplays();
      calculateEstimatedRewards();
      adWatched = false;
    }
  }, 1000);
}

function formatDuration(seconds) {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${d}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
}


const stakeInput = document.getElementById('stakeAmount');

// Prevent invalid characters
stakeInput.addEventListener('keydown', function (e) {
  // Allow: backspace, delete, tab, escape, arrows
  if (
    [8, 9, 27, 46, 37, 38, 39, 40].includes(e.keyCode) ||
    (e.keyCode >= 48 && e.keyCode <= 57) || // top 0–9
    (e.keyCode >= 96 && e.keyCode <= 105)   // numpad 0–9
  ) {
    return; // allow
  }
  e.preventDefault(); // block anything else (e.g., -, +, e, etc.)
});

// Also sanitize on input (in case of paste)
stakeInput.addEventListener('input', function () {
  this.value = this.value.replace(/[^0-9]/g, ''); // Only digits

  const amount = parseInt(this.value || '0', 10);

  if (amount > availableBalance) {
    this.classList.add('warning');
  } else {
    this.classList.remove('warning');
  }

  calculateEstimatedRewards();
  toggleStakeButtonState(); // Coming in next step
});

// Restore countdown if staking is ongoing
const savedEnd = localStorage.getItem('stakingEnd');
if (savedEnd) {
  const timeLeft = Math.floor((parseInt(savedEnd, 10) - Date.now()) / 1000);
  if (timeLeft > 0) {
    setStakeUIState(true); // Lock UI
    startCountdown(timeLeft);
  } else {
    localStorage.removeItem('stakingEnd');
    localStorage.removeItem('stakedAmount');
    localStorage.removeItem('stakedReward');
    setStakeUIState(false); // Unlock just in case
  }
}

function setStakeUIState(disabled) {
  document.getElementById('stakeAmount').disabled = disabled;
  document.getElementById('stake-now-btn').disabled = disabled;
  document.getElementById('watch-ad-btn').disabled = disabled;
  document.getElementById('max-stake-btn').disabled = disabled;

  // Lock/unlock staking cards
  document.querySelectorAll('.staking-card').forEach(card => {
    card.classList.toggle('disabled', disabled);  // Add or remove "disabled" class
    card.style.pointerEvents = disabled ? 'none' : 'auto';  // Disable clicks
  });

  const messageEl = document.getElementById('stake-lock-message');
  if (messageEl) {
    messageEl.style.display = disabled ? 'block' : 'none';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    handleReferral();
    displayReferredUsers();
  }, 1000);
});
