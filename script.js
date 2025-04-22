// Configurações do jogo
const GameConfig = {
    WORLD_WIDTH: 3000,
    WORLD_HEIGHT: 3000,
    PLAYER_SPEED: 50,
    PLAYER_BOOST_SPEED: 100,
    RIVAL_SPEED: 70,
    SNAKE_SEGMENT_RADIUS: 9,
    MAX_SNAKE_RADIUS: 9 * 2.5, // Raio máximo = 2.5x o inicial
    SNAKE_TURN_SPEED: Math.PI * 2.0, // Curvas suaves
    FOOD_RADIUS: 7,
    INITIAL_FOOD_COUNT: 450,
    MAX_FOOD_COUNT: 600,
    FOOD_SPAWN_RATE: 0.5,
    FOOD_COLORS: ['#ffdddd', '#ddffdd', '#ddddff', '#ffffdd', '#ffddff', '#ddffff'],
    BOUNDS_COLOR: 'red',
    BOUNDS_THICKNESS: 190,
    INITIAL_SNAKE_LENGTH: 30,
    CAMERA_SMOOTHING: 0.2,
    RIVAL_COUNT: 100,
    RESPAWN_DELAY: 3, // 3 segundos para reaparecer
    RIVAL_NAMES: [
        'NEGODRAMA', // Sempre presente
        'Kananda', 'Runer', 'Zaya', 'Kraken',
        'Elvis', 'RAIO', 'TROVÃO', 'FURIA',
        'VENENO', 'TEMPESTADE', 'LENDA', 'MITO'
    ],
};

const GRID_SIZE = 100;
// High Scores (Top 3)
const HIGH_SCORES_KEY = 'highScoresMeuJogo';
let highScores = [];

// Estado do jogo
let GameState = {
    playerSnake: null,
    playerDeathCount: 0,
    rivals: [],
    food: [],
    camera: {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        zoom: 2.9 // Zoom aumentado
    },
    mousePos: { x: 0, y: 0 },
    isMouseDown: false,
    isRunning: true,
    spatialGrid: {}, // Grid espacial para colisão

    lastTimestamp: 0,
    foodSpawnTimer: 0,
};

// Declaração global de canvas e ctx
let canvas = null;
let ctx = null;

// Funções utilitárias
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomColor(colors) {
    return colors[Math.floor(Math.random() * colors.length)];
}

function distance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function generateUniqueId() {
    return 'snake_' + Math.random().toString(36).substr(2, 9);
}

// Criação de entidades
function createFood(count) {
    console.log(`Criando ${count} comidas...`);
    for (let i = 0; i < count; i++) {
        if (GameState.food.length >= GameConfig.MAX_FOOD_COUNT) break;
        const margin = GameConfig.BOUNDS_THICKNESS + GameConfig.FOOD_RADIUS;
        GameState.food.push({
            x: getRandomInt(margin, GameConfig.WORLD_WIDTH - margin),
            y: getRandomInt(margin, GameConfig.WORLD_HEIGHT - margin),
            radius: GameConfig.FOOD_RADIUS,
            color: getRandomColor(GameConfig.FOOD_COLORS),
        });
    }
    console.log(`Total de comidas: ${GameState.food.length}`);
}

function createSnake(isPlayer = false, name = null, color = null) {
    const startX = getRandomInt(0, GameConfig.WORLD_WIDTH);
    const startY = getRandomInt(0, GameConfig.WORLD_HEIGHT);
    const segments = [];
    const angle = Math.random() * 2 * Math.PI;
    for (let i = 0; i < GameConfig.INITIAL_SNAKE_LENGTH; i++) {
        segments.push({
            x: startX - i * GameConfig.SNAKE_SEGMENT_RADIUS * 1.5 * Math.cos(angle),
            y: startY - i * GameConfig.SNAKE_SEGMENT_RADIUS * 1.5 * Math.sin(angle),
        });
    }
    const snake = {
        id: generateUniqueId(),
        name: isPlayer 
            ? (name || 'Jogador') 
            : (name || GameConfig.RIVAL_NAMES[Math.floor(Math.random() * (GameConfig.RIVAL_NAMES.length - 1)) + 1]),
        color: isPlayer ? (color || '#00FF00') : (color || getRandomColor(['#FF0000', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'])),
        score: 0,
        isAlive: true,
        deathTime: null,
        segments: segments,
        radius: GameConfig.SNAKE_SEGMENT_RADIUS,
        speed: isPlayer ? GameConfig.PLAYER_SPEED : GameConfig.RIVAL_SPEED,
        angle: angle,
        targetAngle: angle,
        targetLength: GameConfig.INITIAL_SNAKE_LENGTH,
        spawnTime: performance.now(), // tempo de criação para imunidade
    };
    console.log(`Criada cobra ${snake.name} com ID ${snake.id}, cor ${snake.color}`);
    return snake;
}

function createPlayerSnake(name, color) {
    GameState.playerSnake = createSnake(true, name, color);
    const head = GameState.playerSnake.segments[0];
    GameState.camera.targetX = head.x;
    GameState.camera.targetY = head.y;
    GameState.camera.x = head.x;
    GameState.camera.y = head.y;
    console.log('Jogador inicializado:', GameState.playerSnake);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function createRivals() {
    GameState.rivals = [];
    // Sempre garantir NEGODRAMA e KANANDA
    const fixedNames = ['NEGODRAMA', 'KANANDA'];
    // Remove nomes fixos da lista (case-insensitive)
    const allNames = GameConfig.RIVAL_NAMES.filter(
        n => !fixedNames.includes(n.toUpperCase())
    );
    // Embaralha os nomes restantes
    const shuffled = shuffleArray([...allNames]);
    // Monta a lista final de nomes únicos
    const namesPool = [...fixedNames, ...shuffled];
    for (let i = 0; i < GameConfig.RIVAL_COUNT; i++) {
        let rivalName;
        if (i < namesPool.length) {
            rivalName = namesPool[i];
        } else {
            rivalName = `Rival ${i + 1}`;
        }
        GameState.rivals.push(createSnake(false, rivalName));
    }
}

// Atualização de entidades
function updatePlayerSnake(deltaTime) {
    const snake = GameState.playerSnake;
    if (!snake || !snake.isAlive) return;

    const head = snake.segments[0];

    // Calcular ângulo alvo baseado no mouse
    const screenCenterX = canvas.width / 2;
    const screenCenterY = canvas.height / 2;
    const targetWorldX = (GameState.mousePos.x - screenCenterX) / GameState.camera.zoom + GameState.camera.x;
    const targetWorldY = (GameState.mousePos.y - screenCenterY) / GameState.camera.zoom + GameState.camera.y;
    snake.targetAngle = Math.atan2(targetWorldY - head.y, targetWorldX - head.x);

    // Suavizar a transição do ângulo
    let angleDiff = snake.targetAngle - snake.angle;
    while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;

    const maxTurn = GameConfig.SNAKE_TURN_SPEED * deltaTime;
    const angleSmoothing = 0.2;
    snake.angle += Math.max(-maxTurn, Math.min(maxTurn, angleDiff * angleSmoothing));

    // Boost com botão do mouse
    const currentSpeed = GameState.isMouseDown ? GameConfig.PLAYER_BOOST_SPEED : GameConfig.PLAYER_SPEED;

    // Mover cabeça
    const moveX = Math.cos(snake.angle) * currentSpeed * deltaTime;
    const moveY = Math.sin(snake.angle) * currentSpeed * deltaTime;
    const newHead = { x: head.x + moveX, y: head.y + moveY };

    // Mover segmentos
    for (let i = snake.segments.length - 1; i > 0; i--) {
        snake.segments[i].x = snake.segments[i - 1].x;
        snake.segments[i].y = snake.segments[i - 1].y;
    }
    head.x = newHead.x;
    head.y = newHead.y;

    // Atualizar posição alvo da câmera
    GameState.camera.targetX = head.x;
    GameState.camera.targetY = head.y;

    // Crescimento
    if (snake.segments.length < snake.targetLength) {
        const tail = snake.segments[snake.segments.length - 1];
        snake.segments.push({ x: tail.x, y: tail.y });
    }

    // Colisão com comida
    for (let i = GameState.food.length - 1; i >= 0; i--) {
        const foodItem = GameState.food[i];
        const distToFood = distance(head.x, head.y, foodItem.x, foodItem.y);
        if (distToFood < snake.radius + foodItem.radius) {
            GameState.food.splice(i, 1);
            snake.targetLength += 5; // Aumenta o tamanho em 2
            snake.score++;
            // Aumenta o raio (engorda) até um máximo
            const radiusIncrease = 0.05;
            snake.radius = Math.min(snake.radius + radiusIncrease, GameConfig.MAX_SNAKE_RADIUS);
            createFood(1);
            console.log(`${snake.name} coletou comida. Pontuação: ${snake.score}, Raio: ${snake.radius.toFixed(2)}`);
        }
    }
}

function updateRivalSnake(rival, deltaTime) {
    if (!rival || !rival.isAlive) return;

    const head = rival.segments[0];

    // IA: buscar comida mais próxima
    let closestFood = null;
    let minDistance = Infinity;
    GameState.food.forEach(food => {
        const dist = distance(head.x, head.y, food.x, food.y);
        if (dist < minDistance) {
            minDistance = dist;
            closestFood = food;
        }
    });

    if (closestFood) {
        rival.targetAngle = Math.atan2(closestFood.y - head.y, closestFood.x - head.x);
    } else {
        rival.targetAngle += (Math.random() - 0.5) * 0.5;
    }

    // Suavizar rotação
    let angleDiff = rival.targetAngle - rival.angle;
    while (angleDiff <= -Math.PI) angleDiff += 2 * Math.PI;
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    const maxTurn = GameConfig.SNAKE_TURN_SPEED * deltaTime;
    rival.angle += Math.max(-maxTurn, Math.min(maxTurn, angleDiff));

    // Mover cabeça
    const moveX = Math.cos(rival.angle) * rival.speed * deltaTime;
    const moveY = Math.sin(rival.angle) * rival.speed * deltaTime;
    const newHead = { x: head.x + moveX, y: head.y + moveY };

    // Mover segmentos
    for (let i = rival.segments.length - 1; i > 0; i--) {
        rival.segments[i].x = rival.segments[i - 1].x;
        rival.segments[i].y = rival.segments[i - 1].y;
    }
    head.x = newHead.x;
    head.y = newHead.y;

    // Crescimento
    if (rival.segments.length < rival.targetLength) {
        const tail = rival.segments[rival.segments.length - 1];
        rival.segments.push({ x: tail.x, y: tail.y });
    }

    // Colisão com comida
    for (let i = GameState.food.length - 1; i >= 0; i--) {
        const foodItem = GameState.food[i];
        const distToFood = distance(head.x, head.y, foodItem.x, foodItem.y);
        if (distToFood < rival.radius + foodItem.radius) {
            GameState.food.splice(i, 1);
            rival.targetLength += 2; // Aumenta o tamanho em 2
            rival.score++;
            // Aumenta o raio (engorda) até um máximo
            const radiusIncrease = 0.05;
            rival.radius = Math.min(rival.radius + radiusIncrease, GameConfig.MAX_SNAKE_RADIUS);
            createFood(1);
            console.log(`${rival.name} coletou comida. Pontuação: ${rival.score}, Raio: ${rival.radius.toFixed(2)}`);
        }
    }
}

function respawnSnake(snake) {
    snake.isAlive = true;
    snake.deathTime = null;
    snake.score = 0;
    snake.targetLength = GameConfig.INITIAL_SNAKE_LENGTH;
    snake.radius = GameConfig.SNAKE_SEGMENT_RADIUS; // Reseta o raio para o inicial
    snake.segments = [];
    const startX = getRandomInt(snake.radius, GameConfig.WORLD_WIDTH - snake.radius);
    const startY = getRandomInt(snake.radius, GameConfig.WORLD_HEIGHT - snake.radius);
    const angle = Math.random() * 2 * Math.PI;
    for (let i = 0; i < GameConfig.INITIAL_SNAKE_LENGTH; i++) {
        snake.segments.push({
            x: startX - i * GameConfig.SNAKE_SEGMENT_RADIUS * 1.5 * Math.cos(angle),
            y: startY - i * GameConfig.SNAKE_SEGMENT_RADIUS * 1.5 * Math.sin(angle),
        });
    }
    snake.angle = angle;
    snake.targetAngle = angle;
    snake.spawnTime = performance.now(); // tempo de respawn para imunidade
    if (snake === GameState.playerSnake) {
        const head = snake.segments[0];
        GameState.camera.targetX = head.x;
        GameState.camera.targetY = head.y;
        GameState.camera.x = head.x;
        GameState.camera.y = head.y;
    }
    console.log(`${snake.name} reapareceu.`);
}

// Colisões
function checkBoundsCollision(snake, currentTime) {
    if (!snake || !snake.isAlive) return;
    // imunidade nos primeiros 2s após spawn
    if (performance.now() < (snake.spawnTime || 0) + 2000) return;

    const head = snake.segments[0];
    let collided = false;

    if (
        head.x - snake.radius < 0 ||
        head.x + snake.radius > GameConfig.WORLD_WIDTH ||
        head.y - snake.radius < 0 ||
        head.y + snake.radius > GameConfig.WORLD_HEIGHT
    ) {
        collided = true;
    }

    if (collided) {
        dropFoodOnDeath(snake); // Dropa comida baseada na pontuação ANTES de zerar
        // Salva score antes de zerar
        if (snake === GameState.playerSnake) snake.lastScoreBeforeDeath = snake.score;
        snake.isAlive = false;
        snake.deathTime = currentTime;
        snake.score = 0; // Zera a pontuação DEPOIS de dropar a comida
        console.log(`${snake.name} colidiu com a borda e morreu.`);
    }
}

function updateSpatialGrid() {
    GameState.spatialGrid = {};
    const allSnakes = [GameState.playerSnake, ...GameState.rivals].filter(s => s && s.isAlive);
    for (const snake of allSnakes) {
        for (const segment of snake.segments) {
            const cellX = Math.floor(segment.x / GRID_SIZE);
            const cellY = Math.floor(segment.y / GRID_SIZE);
            const key = `${cellX},${cellY}`;
            if (!GameState.spatialGrid[key]) GameState.spatialGrid[key] = [];
            GameState.spatialGrid[key].push({snake, segment});
        }
    }
}

function getNearbySegments(x, y) {
    const cellX = Math.floor(x / GRID_SIZE);
    const cellY = Math.floor(y / GRID_SIZE);
    let nearby = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const key = `${cellX + dx},${cellY + dy}`;
            if (GameState.spatialGrid[key]) {
                nearby = nearby.concat(GameState.spatialGrid[key]);
            }
        }
    }
    return nearby;
}

function checkSnakeCollisions(currentTime) {
    updateSpatialGrid();
    const allSnakes = [GameState.playerSnake, ...GameState.rivals];
    for (let i = 0; i < allSnakes.length; i++) {
        const snake = allSnakes[i];
        if (!snake || !snake.isAlive) continue;
        if (performance.now() < (snake.spawnTime || 0) + 2000) continue;
        const head = snake.segments[0];
        // Broad phase: só compara com segmentos próximos
        const possibles = getNearbySegments(head.x, head.y);
        for (const {snake: otherSnake, segment} of possibles) {
            if (otherSnake === snake) continue;
            // Narrow phase: colisão de círculo
            const dx = head.x - segment.x;
            const dy = head.y - segment.y;
            const rSum = snake.radius + otherSnake.radius;
            if ((dx*dx + dy*dy) < rSum*rSum) {
                // Imunidade
                const now = performance.now();
                const snakeImmune = now < (snake.spawnTime || 0) + 2000;
                const otherImmune = now < (otherSnake.spawnTime || 0) + 2000;
                if (!snakeImmune && !otherImmune) {
                    dropFoodOnDeath(snake);
                    // Salva score antes de zerar
                    if (snake === GameState.playerSnake) snake.lastScoreBeforeDeath = snake.score;
                    snake.isAlive = false;
                    snake.deathTime = currentTime;
                    snake.score = 0;
                    break;
                }
            }
        }
    }
}

function dropFoodOnDeath(snake) {
    const foodToDrop = Math.max(0, Math.floor(snake.score / 2));
    console.log(`${snake.name} morreu com ${snake.score} pontos, dropando ${foodToDrop} comidas.`);
    if (foodToDrop === 0 || snake.segments.length <= 1) return;

    for (let i = 0; i < foodToDrop; i++) {
        // Escolhe um segmento aleatório (exceto a cabeça) para dropar a comida perto dele
        const segmentIndex = getRandomInt(1, snake.segments.length - 1);
        const segment = snake.segments[segmentIndex];
        // Adiciona um pequeno offset aleatório para espalhar a comida
        const offsetX = getRandomInt(-GameConfig.SNAKE_SEGMENT_RADIUS * 2, GameConfig.SNAKE_SEGMENT_RADIUS * 2);
        const offsetY = getRandomInt(-GameConfig.SNAKE_SEGMENT_RADIUS * 2, GameConfig.SNAKE_SEGMENT_RADIUS * 2);
        GameState.food.push({
            x: segment.x + offsetX,
            y: segment.y + offsetY,
            radius: GameConfig.FOOD_RADIUS,
            color: getRandomColor(GameConfig.FOOD_COLORS),
        });
    }
}

function updateCamera(deltaTime) {
    const cam = GameState.camera;
    const smoothFactor = 1 - Math.pow(1 - GameConfig.CAMERA_SMOOTHING, deltaTime * 60);
    cam.x += (cam.targetX - cam.x) * smoothFactor;
    cam.y += (cam.targetY - cam.y) * smoothFactor;
    console.log(`Câmera atualizada: x=${cam.x.toFixed(2)}, y=${cam.y.toFixed(2)}, targetX=${cam.targetX.toFixed(2)}, targetY=${cam.targetY.toFixed(2)}`);
}

// Atualização geral
function update(deltaTime) {
    if (!GameState.isRunning) return;

    const currentTime = GameState.lastTimestamp / 1000;

    updatePlayerSnake(deltaTime);
    GameState.rivals.forEach(rival => updateRivalSnake(rival, deltaTime));

    checkBoundsCollision(GameState.playerSnake, currentTime);
    GameState.rivals.forEach(rival => checkBoundsCollision(rival, currentTime));
    checkSnakeCollisions(currentTime);

    [GameState.playerSnake, ...GameState.rivals].forEach(snake => {
        if (snake && !snake.isAlive && snake.deathTime) {
            // Só conta morte do jogador humano
            if (snake === GameState.playerSnake && !snake.countedDeath) {
                GameState.playerDeathCount = (GameState.playerDeathCount || 0) + 1;
                snake.countedDeath = true;
                // Salva a pontuação ANTES de resetar
                if (typeof snake.lastScoreBeforeDeath !== 'number') {
                    snake.lastScoreBeforeDeath = snake.score;
                }
                // Sempre salva o placar ao morrer
                tentarAdicionarPlacar(snake.name, snake.lastScoreBeforeDeath || 0);
                carregarPlacares();
                // Se atingiu 2 mortes, volta ao lobby
                if (GameState.playerDeathCount % 2 === 0) {
                    // Pausa o jogo
                    GameState.isRunning = false;
                    // Mostra o painel inicial/lobby
                    const startPanel = document.getElementById('startPanel');
                    if (startPanel) startPanel.classList.remove('hidden');
                    // Resetar mortes para o próximo ciclo
                    GameState.playerDeathCount = 0;
                }
            }
            if (currentTime - snake.deathTime >= GameConfig.RESPAWN_DELAY) {
                respawnSnake(snake);
                // Reset flag para próxima morte
                if (snake === GameState.playerSnake) {
                    snake.countedDeath = false;
                    snake.lastScoreBeforeDeath = undefined;
                }
            }
        }
    });

    GameState.foodSpawnTimer += deltaTime;
    const foodToSpawn = Math.floor(GameState.foodSpawnTimer * GameConfig.FOOD_SPAWN_RATE);
    if (foodToSpawn > 0) {
        createFood(foodToSpawn);
        GameState.foodSpawnTimer -= foodToSpawn / GameConfig.FOOD_SPAWN_RATE;
    }

    updateCamera(deltaTime);
}

// Renderização
function renderWorldBackground() {
    if (!ctx) return;
    ctx.fillStyle = '#282828';
    ctx.fillRect(0, 0, GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT);
}

function renderFood() {
    if (!ctx) return;
    const cam = GameState.camera;
    const visibleArea = {
        left: cam.x - canvas.width / (2 * cam.zoom),
        right: cam.x + canvas.width / (2 * cam.zoom),
        top: cam.y - canvas.height / (2 * cam.zoom),
        bottom: cam.y + canvas.height / (2 * cam.zoom),
    };

    GameState.food.forEach(foodItem => {
        if (
            foodItem.x >= visibleArea.left &&
            foodItem.x <= visibleArea.right &&
            foodItem.y >= visibleArea.top &&
            foodItem.y <= visibleArea.bottom
        ) {
            ctx.beginPath();
            ctx.arc(foodItem.x, foodItem.y, foodItem.radius, 0, Math.PI * 2);
            ctx.fillStyle = foodItem.color;
            ctx.fill();
        }
    });
}

function renderSnake(snake, currentTimeMs, isPlayer = false) {
    if (!ctx || !snake || !snake.isAlive) return;
    const elapsed = currentTimeMs - (snake.spawnTime || 0);
    const displayColor = elapsed < 2000 ? '#808080' : snake.color;
    ctx.fillStyle = displayColor;
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 1 / GameState.camera.zoom;

    for (let i = snake.segments.length - 1; i >= 0; i--) {
        const segment = snake.segments[i];
        ctx.beginPath();
        ctx.arc(segment.x, segment.y, snake.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    if (isPlayer) {
        const head = snake.segments[0];
        const eyeRadius = snake.radius * 0.25;
        const eyeOffset = snake.radius * 0.4;
        const eyeAngle1 = snake.angle + Math.PI / 4;
        const eyeAngle2 = snake.angle - Math.PI / 4;

        const eye1X = head.x + Math.cos(eyeAngle1) * eyeOffset;
        const eye1Y = head.y + Math.sin(eyeAngle1) * eyeOffset;
        const eye2X = head.x + Math.cos(eyeAngle2) * eyeOffset;
        const eye2Y = head.y + Math.sin(eyeAngle2) * eyeOffset;

        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 0.5 / GameState.camera.zoom;

        ctx.beginPath();
        ctx.arc(eye1X, eye1Y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(eye2X, eye2Y, eyeRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const pupilRadius = eyeRadius * 0.5;
        const pupilDist = eyeRadius * 0.4;
        const pupilAngle = snake.targetAngle;

        const pupil1X = eye1X + Math.cos(pupilAngle) * pupilDist;
        const pupil1Y = eye1Y + Math.sin(pupilAngle) * pupilDist;
        const pupil2X = eye2X + Math.cos(pupilAngle) * pupilDist;
        const pupil2Y = eye2Y + Math.sin(pupilAngle) * pupilDist;

        ctx.fillStyle = 'black';
        ctx.beginPath();
        ctx.arc(pupil1X, pupil1Y, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(pupil2X, pupil2Y, pupilRadius, 0, Math.PI * 2);
        ctx.fill();
    }
}

function renderWorldBounds() {
    if (!ctx) return;
    ctx.strokeStyle = GameConfig.BOUNDS_COLOR;
    ctx.lineWidth = GameConfig.BOUNDS_THICKNESS / GameState.camera.zoom;
    ctx.strokeRect(0, 0, GameConfig.WORLD_WIDTH, GameConfig.WORLD_HEIGHT);
}

function renderUI() {
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Dados do placar
    const playerSnake = GameState.playerSnake;
    const allSnakes = [playerSnake, ...GameState.rivals].filter(snake => snake);
    allSnakes.sort((a, b) => b.score - a.score);
    let playerRank = -1;
    if (playerSnake) {
        playerRank = allSnakes.findIndex(snake => snake.id === playerSnake.id) + 1;
    }
    const topSnakes = allSnakes.slice(0, 9); // Mostra até 9 como Worms.Zone
    const showPlayerSeparately = playerRank > 9 && playerSnake;

    // Layout estilo Worms.Zone
    const panelX = 20;
    const panelY = 20;
    const panelWidth = 180; // painel mais estreito
    const lineHeight = 22;
    const title = `Melhores jogadores`;
    const displayCount = topSnakes.length + (showPlayerSeparately ? 1 : 0);
    const scoreboardHeight = 10 + displayCount * lineHeight + 22;

    // Painel de fundo totalmente transparente
    // ctx.globalAlpha = 0.8;
    // ctx.fillStyle = "#181f2a";
    // ctx.fillRect(panelX, panelY, panelWidth, scoreboardHeight);
    // ctx.globalAlpha = 1.0;

    // Título
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = "#b0c4de";
    ctx.textAlign = "left";
    ctx.fillText(title, panelX + 6, panelY + 18);

    // Lista
    ctx.font = '14px Arial';
    let yOffset = panelY + 36;
    topSnakes.forEach((snake, idx) => {
        ctx.textAlign = "left";
        ctx.fillStyle = (snake.name === "NEGODRAMA") ? "#ffe066" : "#fff";
        // Nomes mais próximos da pontuação
        ctx.fillText(`${idx + 1}. ${snake.name}`, panelX + 6, yOffset);

        ctx.textAlign = "right";
        ctx.fillStyle = (snake.name === "NEGODRAMA") ? "#ffe066" : "#fff";
        ctx.fillText(snake.score, panelX + panelWidth - 6, yOffset);

        yOffset += lineHeight;
    });
    // Jogador fora do top
    if (showPlayerSeparately) {
        ctx.textAlign = "left";
        ctx.fillStyle = (playerSnake.name === "NEGODRAMA") ? "#ffe066" : "#fff";
        ctx.fillText(`${playerRank}. ${playerSnake.name}`, panelX + 10, yOffset);

        ctx.textAlign = "right";
        ctx.fillStyle = (playerSnake.name === "NEGODRAMA") ? "#ffe066" : "#fff";
        ctx.fillText(playerSnake.score, panelX + panelWidth - 10, yOffset);
    }
    ctx.restore();
}

function render(currentTimeMs) {
    if (!ctx || !canvas) {
        console.warn('Renderização cancelada: canvas ou contexto não disponíveis.');
        return;
    }

    console.log('Iniciando renderização...');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(GameState.camera.zoom, GameState.camera.zoom);
    ctx.translate(-GameState.camera.x, -GameState.camera.y);

    renderWorldBackground();
    renderFood();
    GameState.rivals.forEach(rival => renderSnake(rival, currentTimeMs));
    if (GameState.playerSnake) renderSnake(GameState.playerSnake, currentTimeMs, true);
    renderWorldBounds();

    ctx.restore();

    renderUI();
    console.log('Renderização concluída.');
}

// =================== HIGH SCORE SYSTEM ===================
function carregarPlacares() {
    const str = localStorage.getItem(HIGH_SCORES_KEY);
    if (str) {
        try {
            const arr = JSON.parse(str);
            highScores = Array.isArray(arr) ? arr.map(e => ({
                name: e.name,
                score: parseInt(e.score, 10) || 0
            })) : [];
        } catch (e) {
            highScores = [];
        }
    } else {
        highScores = [];
    }
    exibirPlacares();
}

function salvarPlacares() {
    localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(highScores));
}

function tentarAdicionarPlacar(nome, pontuacaoFinal) {
    if (typeof nome !== 'string' || !nome.trim()) return false;
    nome = nome.trim();
    pontuacaoFinal = parseInt(pontuacaoFinal, 10) || 0;
    let updated = false;
    if (highScores.length < 3 || pontuacaoFinal > highScores[highScores.length - 1].score) {
        highScores.push({ name: nome, score: pontuacaoFinal });
        highScores.sort((a, b) => b.score - a.score);
        highScores = highScores.slice(0, 3);
        salvarPlacares();
        exibirPlacares();
        updated = true;
    }
    return updated;
}

function exibirPlacares() {
    const list = document.getElementById('highScoresList');
    if (!list) return;
    list.innerHTML = '';
    if (!highScores.length) {
        const li = document.createElement('li');
        li.textContent = 'Nenhum placar registrado ainda.';
        list.appendChild(li);
        return;
    }
    highScores.forEach((entry, idx) => {
        const li = document.createElement('li');
        li.textContent = `${idx + 1}º - ${entry.name}: ${entry.score}`;
        list.appendChild(li);
    });
}

// Chame carregarPlacares() ao iniciar o jogo ou mostrar a tela de placares
// Chame tentarAdicionarPlacar(nome, score) ao final da partida

document.addEventListener('DOMContentLoaded', () => {
    carregarPlacares();
});

// Loop principal
function gameLoop(timestamp) {
    if (!ctx || !canvas) {
        console.warn('Game loop interrompido: canvas ou contexto não disponíveis.');
        return;
    }

    console.log('Iniciando game loop...');
    const deltaTime = Math.min(0.1, (timestamp - GameState.lastTimestamp) / 1000);
    GameState.lastTimestamp = timestamp;

    update(deltaTime);
    render(timestamp);

    requestAnimationFrame(gameLoop);
}

// Eventos
function handleMouseMove(event) {
    GameState.mousePos.x = event.clientX;
    GameState.mousePos.y = event.clientY;
}

function handleMouseDown(event) {
    if (event.button === 0) GameState.isMouseDown = true;
}

function handleMouseUp(event) {
    if (event.button === 0) GameState.isMouseDown = false;
}

function resizeCanvas() {
    if (!canvas) {
        console.warn('Não foi possível redimensionar: canvas não disponível.');
        return;
    }
    const maxWidth = 1280;
    const maxHeight = 720;
    canvas.width = Math.min(window.innerWidth, maxWidth);
    canvas.height = Math.min(window.innerHeight, maxHeight);
    console.log(`Canvas redimensionado: ${canvas.width}x${canvas.height}`);
}

// Configuração do painel inicial
function setupStartPanel() {
    const startPanel = document.getElementById('startPanel');
    const playerNameInput = document.getElementById('playerName');
    const startButton = document.getElementById('startButton');
    const colorButtons = document.querySelectorAll('.color-btn');
    let selectedColor = '#00FF00'; // Cor padrão

    // Seleção de cor
    colorButtons.forEach(button => {
        button.addEventListener('click', () => {
            colorButtons.forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            selectedColor = button.getAttribute('data-color');
            console.log(`Cor selecionada: ${selectedColor}`);
        });
    });

    // Iniciar jogo
    startButton.addEventListener('click', () => {
        let playerName = playerNameInput.value.trim();
        if (playerName === '') {
            playerName = 'Jogador';
        }
        console.log(`Iniciando jogo com nome: ${playerName}, cor: ${selectedColor}`);
        startPanel.classList.add('hidden');
        createPlayerSnake(playerName, selectedColor);
        createFood(GameConfig.INITIAL_FOOD_COUNT);
        createRivals();
        GameState.playerDeathCount = 0; // Resetar mortes ao iniciar/reiniciar
        console.log(`Estado inicial: Jogador=${!!GameState.playerSnake}, Rivais=${GameState.rivals.length}, Comidas=${GameState.food.length}`);
        GameState.lastTimestamp = performance.now();
        GameState.isRunning = true;
        requestAnimationFrame(gameLoop);
    });
}

// Event listener para o botão de tela cheia
const fullscreenBtn = document.getElementById('fullscreenBtn');
if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Erro ao tentar entrar em tela cheia: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    });
}

// Inicialização
function initGame() {
    if (!canvas || !ctx) {
        console.error('Não foi possível inicializar o jogo: canvas ou contexto não disponíveis.');
        return;
    }

    console.log('Inicializando o jogo...');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    window.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);
}

// Iniciar o jogo após o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM carregado, iniciando o jogo...');
    canvas = document.getElementById('gameCanvas');
    if (canvas) {
        ctx = canvas.getContext('2d');
        console.log('Canvas encontrado e contexto 2D inicializado.');
    } else {
        console.error('Erro: Elemento canvas com ID "gameCanvas" não encontrado.');
        return;
    }
    initGame();
    setupStartPanel();
});
