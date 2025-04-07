// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
  // Game Variables
  let lives = 5;
  let coins = 0;
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
  const walletButton = document.getElementById('wallet-button');
  const walletStatus = document.getElementById('wallet-status');

  // Initialize Telegram Web App
  const tg = window.Telegram?.WebApp;
  if (tg) {
    tg.ready();
    tg.expand(); // Make the app full-screen
    tg.enableClosingConfirmation(); // Ask user before closing

    // Enable Back Button
    tg.BackButton.show();
    tg.BackButton.onClick(() => {
      if (gameContainer.style.display === 'block') {
        gameContainer.style.display = 'none';
        startScreen.style.display = 'flex';
        pauseTimer();
      } else {
        tg.close(); // Close the app if on start screen
      }
    });
  } else {
    console.error('Telegram WebApp not available');
  }

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

  // TON Connect Integration
  let tonConnectUI;
  
  try {
    // Initialize TON Connect with proper configuration
    tonConnectUI = new window.TONConnectUI.TONConnectUI({
      manifestUrl: 'https://memoryflip-game-app.vercel.app/tonconnect-manifest.json',
      buttonRootId: 'ton-connect-button',
      hideWalletList: true // Hide the default wallet list UI
    });
    
    console.log('TON Connect initialized successfully');
    
    // Handle Wallet Connection Status
    tonConnectUI.onStatusChange((wallet) => {
      console.log('Wallet status changed:', wallet ? 'Connected' : 'Disconnected');
      if (wallet) {
        const address = wallet.account.address;
        const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;
        walletStatus.textContent = `Connected: ${shortAddress}`;
        walletStatus.style.color = '#4CAF50'; // Green color for connected status
        
        // Save wallet connection to localStorage
        localStorage.setItem('walletConnected', 'true');
        localStorage.setItem('walletAddress', address);
        
        // Update UI for connected wallet
        walletButton.style.opacity = '1';
        
        // Track wallet connection event
        if (window.telegramAnalytics) {
          window.telegramAnalytics.track('wallet_connected');
        }
      } else {
        walletStatus.textContent = 'Wallet not connected';
        walletStatus.style.color = 'white';
        localStorage.removeItem('walletConnected');
        localStorage.removeItem('walletAddress');
        walletButton.style.opacity = '0.7';
      }
    });
  } catch (error) {
    console.error('Error initializing TON Connect:', error);
    walletStatus.textContent = 'Wallet service unavailable';
  }

  // Wallet Button Click Event
  walletButton.addEventListener('click', async () => {
    console.log('Wallet button clicked');
    
    if (!tonConnectUI) {
      console.error('TON Connect UI not initialized');
      walletStatus.textContent = 'Wallet service unavailable';
      return;
    }
    
    try {
      walletStatus.textContent = 'Connecting...';
      
      if (tonConnectUI.connected) {
        // If already connected, disconnect
        await tonConnectUI.disconnect();
        walletStatus.textContent = 'Wallet disconnected';
      } else {
        // Show modal to connect wallet
        await tonConnectUI.openModal();
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      walletStatus.textContent = 'Connection failed. Try again.';
    }
  });

  // Check for saved wallet connection on load
  window.addEventListener('load', () => {
    // Restore coins from localStorage
    coins = parseInt(localStorage.getItem('coins'), 10) || 0;
    coinsDisplay.textContent = coins;
    
    // Check for previously connected wallet
    const walletConnected = localStorage.getItem('walletConnected') === 'true';
    if (walletConnected && tonConnectUI) {
      // Auto-reconnect if previously connected
      const walletAddress = localStorage.getItem('walletAddress');
      if (walletAddress) {
        const shortAddress = `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        walletStatus.textContent = `Reconnecting: ${shortAddress}`;
        
        // Don't immediately reconnect - wait for user action
        walletButton.style.opacity = '1';
      }
    }
  });

  // Start Button Click Event
  startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameContainer.style.display = "block";
    initGame();
    // Track game start event
    if (window.telegramAnalytics) {
      window.telegramAnalytics.track('game_start');
    }
  });

  // Card Values (images in public folder)
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
  const cardValues = [...cardImages, ...cardImages]; // Duplicate for pairs

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

    // Generate Cards
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

    // Start Timer
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
    if (!countdownInterval) {
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
    if (flippedCards.length !== 2) return;
    
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
        
        // If wallet is connected, we could send a reward
        if (tonConnectUI && tonConnectUI.connected) {
          console.log('User won with connected wallet!');
          // Here you could implement a function to send TON rewards
          // This would require backend integration
        }
        
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
    let remainingTime = 10800;
    countdownTimer.textContent = formatTime(remainingTime);

    waitingInterval = setInterval(() => {
      remainingTime--;
      countdownTimer.textContent = formatTime(remainingTime);

      if (remainingTime <= 0) {
        clearInterval(waitingInterval);
        noLivesPopup.style.display = "none";
        lives = 5;
        livesDisplay.textContent = lives;
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
    
    if (typeof show_9069289 === 'function') {
      show_9069289().then(() => {
        initGame();
        resumeTimer();
      }).catch(() => {
        isRetry = false;
        lives--;
        livesDisplay.textContent = lives;
        if (lives > 0) {
          initGame();
        } else {
          showNoLivesPopup();
        }
      });
    } else {
      console.error('Ad function not available');
      isRetry = false;
      lives--;
      livesDisplay.textContent = lives;
      if (lives > 0) {
        initGame();
      } else {
        showNoLivesPopup();
      }
    }
  });

  // Next Button Click Event
  nextButton.addEventListener("click", () => {
    losePopup.style.display = "none";
    lives--;
    livesDisplay.textContent = lives;
    isRetry = false;
    if (lives > 0) {
      initGame();
    } else {
      showNoLivesPopup();
    }
  });
});