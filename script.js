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
        gameContainer.classList.remove('hidden');
        playMusic(); // Start music when loading completes
      }
    }, 150);
  }

  startLoadingAnimation();

  // Start Button Click Event
  startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameContainer.style.display = "block";
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

  // Pause Timer
  function pauseTimer() {
    if (countdownInterval) {
      clearInterval(countdownInterval);
      countdownInterval = null;
    }
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

  function checkDailyRewardEligibility() {
    const now = new Date();
    if (!lastClaimDate) {
      canClaim = true;
      return;
    }
    const lastClaim = new Date(lastClaimDate);
    const timeDiff = now - lastClaim;
    if (timeDiff >= 86400000) {
      canClaim = true;
      if (timeDiff > 86400000 + 60 * 1000) {
        currentDay = 0;
        localStorage.setItem('dailyRewardDay', currentDay);
      }
    } else {
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
    currentDay = (currentDay + 1) % 7 || 1;
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
      backgroundMusic.volume = 0.1; // Set to 30% volume to avoid being too loud
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

  // Start music when game loads or user interacts
  startButton.addEventListener('click', () => {
    playMusic();
  });

  // Pause music on popup open, resume on close
  [winPopup, losePopup, noLivesPopup, dailyBonusPopup].forEach(popup => {
    popup.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.className === 'close-btn') {
        pauseMusic();
      }
    });
    popup.addEventListener('transitionend', (e) => {
      if (!popup.style.display || popup.style.display === 'none') {
        playMusic();
      }
    });
  });
});