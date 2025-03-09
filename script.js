// Game Variables
let lives = 5;
let coins = 0;
let timer = 30;
let flippedCards = [];
let matchedPairs = 0;
let isGameRunning = false;
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

// Loading Bar Animation
let loadValue = 0;
const loadingInterval = setInterval(() => {
  loadValue += 5;
  loadingProgress.style.width = loadValue + "%";

  if (loadValue >= 100) {
    clearInterval(loadingInterval);
    loadingScreen.style.display = "none";
    startScreen.style.display = "flex"; // Show Start Screen after loading
  }
}, 150);

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
        <div class="back">${value}</div>
      </div>`;
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
  const countdown = setInterval(() => {
    if (timer > 0) {
      timer--;
      timerDisplay.textContent = timer;
    } else {
      clearInterval(countdown);
      endGame(false); // Time's up
    }
  }, 1000);
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

    if (matchedPairs === totalPairs) {
      coins += 500; // Bonus for winning
      coinsDisplay.textContent = coins;
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

// End Game
function endGame(win) {
  isGameRunning = false;
  alert(win ? "You win! 🎉" : "Time’s up! Try again.");
  lives--;

  if (lives === 0) {
    alert("No lives left! Wait 3 hours to play again.");
    lives = 5;
  }

  livesDisplay.textContent = lives;
  setTimeout(initGame, 2000);
}
