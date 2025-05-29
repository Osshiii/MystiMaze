// Difficulty settings
const difficulties = {
    easy: {
        rows: 10,
        cols: 15,
        monsterSpeed: 800,
        extraPaths: 40
    },
    medium: {
        rows: 15,
        cols: 20,
        monsterSpeed: 500,
        extraPaths: 30
    },
    hard: {
        rows: 20,
        cols: 30,
        monsterSpeed: 300,
        extraPaths: 20
    }
};

let currentDifficulty = 'medium'; // Default difficulty

// DOM elements
const homeScreen = document.getElementById('homeScreen');
const gameScreen = document.getElementById('gameScreen');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const currentDifficultyDisplay = document.getElementById('currentDifficulty');
const backToHomeBtn = document.getElementById('backToHome');
const lifetimeScoreDisplay = document.getElementById('lifetimeScore');
const gameLifetimeScoreDisplay = document.getElementById('gameLifetimeScore');

// Game elements
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');

// Game variables
let rows, cols, cellSize, maze, player, exit, monster, monsterInterval;

// Audio elements
const bgMusic = new Audio('src/js/sounds/play.mp3');
bgMusic.loop = true;
const langkahSound = new Audio('src/js/sounds/walking2.mp3');
const gameOverSound = new Audio('src/js/sounds/gameover.wav');
const victorySound = new Audio('src/js/sounds/victory.mp3');
let bgStarted = false;

// Initialize game with selected difficulty
function initGame() {
    const settings = difficulties[currentDifficulty];
    rows = settings.rows;
    cols = settings.cols;
    
    cellSize = Math.floor(800 / cols);

    canvas.width = cellSize * cols;
    canvas.height = cellSize * rows;

    maze = [];
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) {
            maze[y][x] = 1;
        }
    }

    player = {
        x: 0,
        y: 0,
        size: cellSize / 2,
        color: 'red'
    };

    // Fix exit to always be in even coordinates (reachable)
    let exitX = cols - 1;
    let exitY = rows - 1;
    if (exitX % 2 === 1) exitX--;
    if (exitY % 2 === 1) exitY--;

    exit = {
        x: exitX,
        y: exitY,
        size: cellSize,
        color: 'green'
    };

    monster = {
        x: cols - 1,
        y: 0,
        size: cellSize / 2,
        color: 'purple'
    };

    // generate maze
    maze[0][0] = 0;
    carvePassagesFrom(0, 0);

    // Make sure exit is a path
    maze[exit.y][exit.x] = 0;
    // CEK: pastikan titik start (0,0) punya lebih dari 1 arah bebas
function countFreeNeighbors(x, y) {
    const directions = [
        [0, 1],
        [1, 0],
        [0, -1],
        [-1, 0]
    ];
    let count = 0;
    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 0) {
            count++;
        }
    }
    return count;
}

// Ulangi maze jika start terlalu sempit
let safetyCount = 0;
while (countFreeNeighbors(0, 0) < 2 && safetyCount < 50) {
    carvePassagesFrom(0, 0);
    maze[exit.y][exit.x] = 0;
    safetyCount++;
}


    // FORCE BFS-PATH TO EXIT if not reachable
    let path = bfs({ x: 0, y: 0 }, { x: exit.x, y: exit.y });
    if (path.length <= 1) {
        console.log("BFS gagal, buka paksa jalan ke exit...");

        for (let i = 1; i < path.length; i++) {
            const {x, y} = path[i];
            maze[y][x] = 0;
        }

        if (path.length === 1) {
            // brute force path if totally disconnected
            let x = 0, y = 0;
            while (x !== exit.x || y !== exit.y) {
                maze[y][x] = 0;
                if (x < exit.x) x++;
                else if (y < exit.y) y++;
                else break;
            }
            maze[exit.y][exit.x] = 0;
        }
    }

    // Tambah extra path seperti biasa
    for (let i = 0; i < settings.extraPaths; i++) {
        const x = Math.floor(Math.random() * (cols - 2)) + 1;
        const y = Math.floor(Math.random() * (rows - 2)) + 1;

        if (maze[y][x] === 1 && (
            maze[y - 1][x] === 0 || maze[y + 1][x] === 0 ||
            maze[y][x - 1] === 0 || maze[y][x + 1] === 0
        )) {
            maze[y][x] = 0;
        }
    }
}

// Maze generation using recursive backtracking
function carvePassagesFrom(x, y) {
    const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1]
    ];

    directions.sort(() => Math.random() - 0.5);

    for (const [dx, dy] of directions) {
        const nx = x + dx * 2;
        const ny = y + dy * 2;

        if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 1) {
            maze[y + dy][x + dx] = 0;
            maze[ny][nx] = 0;
            carvePassagesFrom(nx, ny);
        }
    }
}

// Start the game with selected difficulty
function startGame() {
    homeScreen.style.display = 'none';
    gameScreen.style.display = 'flex';
    
    initGame();
    draw();
    
    // Set monster movement interval based on difficulty
    clearInterval(monsterInterval);
    monsterInterval = setInterval(moveMonster, difficulties[currentDifficulty].monsterSpeed);
    
    // Play background music
    if (!bgStarted) {
        bgMusic.play().catch(e => console.warn("Autoplay ditolak:", e));
        bgStarted = true;
    }
}

// Move monster toward player using BFS
function moveMonster() {
    const path = bfs(monster, player);
    if (path.length > 1) {
        monster.x = path[1].x;
        monster.y = path[1].y;
    }

    if (monster.x === player.x && monster.y === player.y) {
    bgMusic.pause();
    bgMusic.currentTime = 0;
    bgStarted = false; // RESET

    gameOverSound.play();
    alert("Game Over! You were caught by the monster!");
    
    gameScreen.style.display = 'none';
    homeScreen.style.display = 'flex';
    clearInterval(monsterInterval);
    }
}

// Breadth-First Search for monster pathfinding
function bfs(start, end) {
    const queue = [[start]];
    const visited = Array(rows).fill().map(() => Array(cols).fill(false));
    visited[start.y][start.x] = true;

    while (queue.length > 0) {
        const path = queue.shift();
        const { x, y } = path[path.length - 1];

        if (x === end.x && y === end.y) return path;

        const directions = [[0,1],[1,0],[0,-1],[-1,0]];
        for (const [dx, dy] of directions) {
            const nx = x + dx;
            const ny = y + dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && maze[ny][nx] === 0 && !visited[ny][nx]) {
                visited[ny][nx] = true;
                queue.push([...path, {x: nx, y: ny}]);
            }
        }
    }

    return [start]; // fallback
}

// Drawing functions
function drawMaze() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            ctx.fillStyle = maze[y][x] === 1 ? 'black' : 'white';
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
    }
}

function drawPlayer() {
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x * cellSize + (cellSize - player.size) / 2, player.y * cellSize + (cellSize - player.size) / 2, player.size, player.size);
    ctx.fillText("🧝🏼‍♂", player.x * cellSize + cellSize / 2, player.y * cellSize + cellSize / 2);
}

function drawMonster() {
    ctx.font = `${cellSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("👾", monster.x * cellSize + cellSize / 2, monster.y * cellSize + cellSize / 2);
}

function drawExit() {
    ctx.fillStyle = exit.color;
    ctx.fillRect(exit.x * cellSize, exit.y * cellSize, exit.size, exit.size);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawMaze();
    drawPlayer();
    drawMonster();
    drawExit();
    requestAnimationFrame(draw);
}

// Player movement
function movePlayer(dx, dy) {
    if (!bgStarted) {
        bgMusic.play().catch(e => console.warn("Autoplay ditolak:", e));
        bgStarted = true;
    }
    
    const newX = player.x + dx;
    const newY = player.y + dy;
    
    if (newX >= 0 && newX < cols && newY >= 0 && newY < rows && !checkCollision(newX, newY)) {
        player.x = newX;
        player.y = newY;

        // Play step sound
        langkahSound.currentTime = 0;
        langkahSound.play().catch(e => console.warn("Gagal memainkan langkahSound:", e));
        
        checkWin();
    }
}

function checkCollision(x, y) {
    return maze[y][x] === 1;
}

// Win condition
function checkWin() {
    if (player.x === exit.x && player.y === exit.y) {
        bgMusic.pause();
        bgMusic.currentTime = 0;
        bgStarted = false;

        victorySound.play();

        const key = `score_${currentDifficulty}`;
        const currentScore = parseInt(localStorage.getItem(key)) || 0;
        localStorage.setItem(key, currentScore + 1);
        
        updateScoreDisplay();
        
        alert(`Congratulations, you've escaped the ${currentDifficulty} maze!\nYour ${currentDifficulty} score is now: ${currentScore + 1}`);
        
        gameScreen.style.display = 'none';
        homeScreen.style.display = 'flex';
        clearInterval(monsterInterval);
    }
}
// Update score display
function updateScoreDisplay() {
    const easy = parseInt(localStorage.getItem('score_easy')) || 0;
    const medium = parseInt(localStorage.getItem('score_medium')) || 0;
    const hard = parseInt(localStorage.getItem('score_hard')) || 0;

    const total = easy + medium + hard;

    document.getElementById('scoreEasy').textContent = `Easy Score: ${easy}`;
    document.getElementById('scoreMedium').textContent = `Medium Score: ${medium}`;
    document.getElementById('scoreHard').textContent = `Hard Score: ${hard}`;

    // Update lifetime score di home dan game screen
    const lifetimeScoreEls = document.querySelectorAll('#lifetimeScore, #gameLifetimeScore');
    lifetimeScoreEls.forEach(el => el.textContent = `Lifetime Score: ${total}`);
}


// Event listeners for difficulty selection
difficultyButtons.forEach(button => {
    button.addEventListener('click', () => {
        currentDifficulty = button.dataset.level;
        currentDifficultyDisplay.textContent = `Difficulty: ${currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1)}`;
        startGame();
    });
});

// Back to home button
backToHomeBtn.addEventListener('click', () => {
    gameScreen.style.display = 'none';
    homeScreen.style.display = 'flex';
    clearInterval(monsterInterval);
});


// Regenerate maze button
document.getElementById('regenerateMaze').addEventListener('click', () => {
    const currentScore = localStorage.getItem('lifetimeScore') ? parseInt(localStorage.getItem('lifetimeScore')) : 0;
    localStorage.setItem('lifetimeScore', Math.max(0, currentScore - 1));
    updateScoreDisplay();
    initGame();
});

// Keyboard controls
window.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
            movePlayer(0, -1);
            e.preventDefault();
            break;
        case 'ArrowDown':
            movePlayer(0, 1);
            e.preventDefault();
            break;
        case 'ArrowLeft':
            movePlayer(-1, 0);
            e.preventDefault();
            break;
        case 'ArrowRight':
            movePlayer(1, 0);
            e.preventDefault();
            break;
    }
});

// Button controls
document.getElementById('moveUp').addEventListener('click', () => movePlayer(0, -1));
document.getElementById('moveDown').addEventListener('click', () => movePlayer(0, 1));
document.getElementById('moveLeft').addEventListener('click', () => movePlayer(-1, 0));
document.getElementById('moveRight').addEventListener('click', () => movePlayer(1, 0));

// Initialize score display
document.addEventListener("DOMContentLoaded", () => {
    updateScoreDisplay();
});
