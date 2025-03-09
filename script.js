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

  // Initialize Loading Animation
  function startLoadingAnimation() {
    let loadValue = 0;
    const loadingInterval = setInterval(() => {
      if (!loadingScreen || !loadingProgress) {
        clearInterval(loadingInterval); // Stop if elements are still null
        console.error('Loading elements not found');
        return;
      }
      loadValue += 5;
      loadingProgress.style.width = loadValue + "%";

      if (loadValue >= 100) {
        clearInterval(loadingInterval);
        loadingScreen.style.display = "none";
        startScreen.style.display = "flex"; // Show Start Screen after loading
      }
    }, 150);
  }

  // Start loading animation after DOM is ready
  startLoadingAnimation();

  // Start Button Click Event
  startButton.addEventListener("click", () => {
    startScreen.style.display = "none";
    gameContainer.style.display = "block";
    initGame(); // Start the game when Start Button is clicked
  });

  // Card Values
  const cardValues = [...Array(totalPairs).keys(), ...Array(totalPairs).keys()];

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
    cardValues.forEach((value) => {
      const card = document.createElement('div');
      card.classList.add('card');
      card.innerHTML = 
        `<div class="card-inner">
          <div class="front"></div>
          <div class="back">${value}</div>`;
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
    if (countdownInterval) clearInterval(countdownInterval); // Clear any existing interval
    countdownInterval = setInterval(() => {
      if (timer > 0) {
        timer--;
        timerDisplay.textContent = timer;
      } else {
        clearInterval(countdownInterval);
        endGame(false); // Time's up
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
          endGame(false); // Time's up
        }
      }, 1000);
    }
  }

  // Handle Card Flip
  function handleCardFlip(event) {
    if (!isGameRunning) return;
    const card = event.currentTarget;

    // Ignore already flipped or matched cards
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
    const value1 = card1.querySelector('.back').textContent;
    const value2 = card2.querySelector('.back').textContent;

    if (value1 === value2) {
      matchedPairs++;
      coins += 50;
      coinsDisplay.textContent = coins;
      localStorage.setItem('coins', coins); // Save coins

      if (matchedPairs === totalPairs) {
        coins += 500; // Bonus for winning
        coinsDisplay.textContent = coins;
        localStorage.setItem('coins', coins); // Save coins
        endGame(true); // Win condition
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
    pauseTimer(); // Ensure timer is paused
    winPopup.style.display = "flex";
  }

  // Show Lose Popup
  function showLosePopup() {
    pauseTimer(); // Ensure timer is paused
    losePopup.style.display = "flex";
  }

  // Show No Lives Left Popup
  function showNoLivesPopup() {
    pauseTimer(); // Ensure timer is paused
    noLivesPopup.style.display = "flex";
    let remainingTime = 10800; // 3 hours in seconds
    countdownTimer.textContent = formatTime(remainingTime);

    waitingInterval = setInterval(() => {
      remainingTime--;
      countdownTimer.textContent = formatTime(remainingTime);

      if (remainingTime <= 0) {
        clearInterval(waitingInterval);
        noLivesPopup.style.display = "none";
        lives = 5;
        livesDisplay.textContent = lives;
        coins = parseInt(localStorage.getItem('coins'), 10) || 0; // Restore coins
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
    pauseTimer(); // Ensure timer pauses
    if (win) {
      showWinPopup(); // Show win popup without altering lives yet
    } else {
      showLosePopup(); // Show lose popup without altering lives yet
    }
  }

  // Close Popup Button Click Event (Updated to deduct a life)
  closePopupButton.addEventListener("click", () => {
    winPopup.style.display = "none";
    lives--; // Deduct one life when closing the win popup
    livesDisplay.textContent = lives;
    coins = parseInt(localStorage.getItem('coins'), 10) || 0; // Ensure coins are updated
    coinsDisplay.textContent = coins;
    if (lives > 0) {
      initGame(); // Restart game if lives remain
    } else {
      showNoLivesPopup(); // Show no lives popup if lives hit zero
    }
  });

  // Continue Button Click Event (Show Ad and Restart Game)
  continueButton.addEventListener("click", () => {
    losePopup.style.display = "none";
    lives--; // Decrease lives only when user clicks
    livesDisplay.textContent = lives;
    if (lives > 0) {
      initGame(); // Restart game if lives remain
    } else {
      showNoLivesPopup(); // Show no lives popup if lives hit zero
    }
  });

  // Next Button Click Event
  nextButton.addEventListener("click", () => {
    losePopup.style.display = "none";
    lives--; // Decrease lives only when user clicks
    livesDisplay.textContent = lives;
    if (lives > 0) {
      initGame(); // Restart game if lives remain
    } else {
      showNoLivesPopup(); // Show no lives popup if lives hit zero
    }
  });

  // On Load, Restore Coins
  window.addEventListener('load', () => {
    coins = parseInt(localStorage.getItem('coins'), 10) || 0;
    coinsDisplay.textContent = coins;
  });
});