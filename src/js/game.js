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