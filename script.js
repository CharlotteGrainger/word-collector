// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Fallback for roundRect if not supported
if (!ctx.roundRect) {
    ctx.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}
const gameOverDiv = document.getElementById('gameOver');
const gameOverText = document.getElementById('gameOverText');
const restartBtn = document.getElementById('restartBtn');
const wordCountElement = document.getElementById('wordCount');
const livesElement = document.getElementById('lives');

// Game state
let gameRunning = true;
let wordsCollected = 0;
let lives = 3;
const totalWords = 20;
let showSpeechBubble = false;
let speechBubbleTimer = 0;
let speechBubbleText = "";

// Self-doubt messages that appear randomly
const selfDoubtMessages = [
    "Can I really write this?",
    "Maybe I'm not good enough...",
    "What if nobody likes my story?",
    "Am I just fooling myself?",
    "These words feel so empty...",
    "I should probably give up..."
];

// Corporate speak from blonde model agents
const agentMessages = [
    "We'll circle back on this",
    "Have you tried reworking it all?",
    "Let's take this offline",
    "We need to pivot your approach",
    "This isn't scalable",
    "We should ideate on this"
];

// Player (Detailed Female Author) object
const player = {
    x: 50,
    y: 300,
    width: 30,
    height: 40,
    velocityX: 0,
    velocityY: 0,
    onGround: false,
    speed: 5,
    jumpPower: 12,
    // Additional details
    hairColor: "#ff4500", // Red hair
    gender: "female",
    outfitColor: "#ff69b4", // Pink outfit
};

// Collectible words for the book (common writing words)
const bookWords = [
    'the', 'and', 'to', 'of', 'a', 'in', 'that', 'have',
    'I', 'it', 'for', 'not', 'on', 'with', 'he', 'as',
    'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from',
    'they', 'we', 'say', 'her', 'she', 'or', 'an', 'will'
];

// Platform objects
const platforms = [
    { x: 0, y: 380, width: 800, height: 20 }, // Ground
    { x: 150, y: 320, width: 100, height: 15 },
    { x: 300, y: 260, width: 120, height: 15 },
    { x: 480, y: 200, width: 100, height: 15 },
    { x: 650, y: 280, width: 100, height: 15 },
    { x: 100, y: 180, width: 80, height: 15 },
    { x: 600, y: 140, width: 90, height: 15 },
    { x: 350, y: 120, width: 100, height: 15 }
];

// End door object
const endDoor = {
    x: 720,
    y: 340,
    width: 40,
    height: 60,
    unlocked: false
};

// Word collectibles
let words = [];

// Enemies (writer's block obstacles)
let enemies = [];

// Input handling
const keys = {};

document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
});

// Initialize game
function initGame() {
    gameRunning = true;
    wordsCollected = 0;
    lives = 3;
    player.x = 50;
    player.y = 300;
    player.velocityX = 0;
    player.velocityY = 0;
    
    // Reset door and speech bubble
    endDoor.unlocked = false;
    showSpeechBubble = false;
    speechBubbleTimer = 0;
    
    // Generate collectible words
    words = [];
    for (let i = 0; i < totalWords; i++) {
        const platform = platforms[Math.floor(Math.random() * (platforms.length - 1)) + 1];
        const wordText = bookWords[i % bookWords.length];
        const wordWidth = Math.max(50, wordText.length * 8); // Dynamic width based on word length
        words.push({
            x: platform.x + Math.random() * (platform.width - wordWidth),
            y: platform.y - 20,
            width: wordWidth,
            height: 18,
            word: wordText,
            collected: false
        });
    }
    
    // Generate enemies
    enemies = [];
    for (let i = 0; i < 3; i++) {
        const platform = platforms[Math.floor(Math.random() * (platforms.length - 1)) + 1];
        enemies.push({
            x: platform.x + platform.width - 40,
            y: platform.y - 25,
            width: 25,
            height: 25,
            velocityX: -1 + Math.random() * 2,
            platform: platform,
            defeated: false,
            message: agentMessages[Math.floor(Math.random() * agentMessages.length)],
            messageTimer: 0,
            showMessage: false
        });
    }
    
    updateUI();
    gameOverDiv.classList.add('hidden');
}

// Update game state
function update() {
    if (!gameRunning) return;
    
    // Player input
    if (keys['arrowleft'] || keys['a']) {
        player.velocityX = -player.speed;
    } else if (keys['arrowright'] || keys['d']) {
        player.velocityX = player.speed;
    } else {
        player.velocityX *= 0.8; // Friction
    }
    
    if ((keys['arrowup'] || keys['w'] || keys[' ']) && player.onGround) {
        player.velocityY = -player.jumpPower;
        player.onGround = false;
    }
    
    // Apply gravity
    player.velocityY += 0.5;
    
    // Update player position
    player.x += player.velocityX;
    player.y += player.velocityY;
    
    // Keep player in bounds
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    // Platform collision
    player.onGround = false;
    for (let platform of platforms) {
        if (player.x < platform.x + platform.width &&
            player.x + player.width > platform.x &&
            player.y < platform.y + platform.height &&
            player.y + player.height > platform.y) {
            
            // Landing on top of platform
            if (player.velocityY > 0 && player.y < platform.y) {
                player.y = platform.y - player.height;
                player.velocityY = 0;
                player.onGround = true;
            }
        }
    }
    
    // Check if player fell off the screen
    if (player.y > canvas.height) {
        lives--;
        if (lives <= 0) {
            gameOver();
        } else {
            // Respawn player
            player.x = 50;
            player.y = 300;
            player.velocityX = 0;
            player.velocityY = 0;
            updateUI();
        }
    }
    
    // Word collection
    for (let word of words) {
        if (!word.collected &&
            player.x < word.x + word.width &&
            player.x + player.width > word.x &&
            player.y < word.y + word.height &&
            player.y + player.height > word.y) {
            
            word.collected = true;
            wordsCollected++;
            updateUI();
            
            if (wordsCollected >= totalWords) {
                endDoor.unlocked = true;
            }
            
            // Random chance to show self-doubt message
            if (Math.random() < 0.15 && !showSpeechBubble) {
                showSpeechBubble = true;
                speechBubbleTimer = 180; // 3 seconds at 60fps
                speechBubbleText = selfDoubtMessages[Math.floor(Math.random() * selfDoubtMessages.length)];
            }
        }
    }
    
    // Update enemies
    for (let enemy of enemies) {
        if (!enemy.defeated) {
            enemy.x += enemy.velocityX;
            
            // Bounce off platform edges
            if (enemy.x <= enemy.platform.x || enemy.x + enemy.width >= enemy.platform.x + enemy.platform.width) {
                enemy.velocityX *= -1;
            }
            
            // Random chance for agents to show corporate speak
            if (Math.random() < 0.005 && !enemy.showMessage) {
                enemy.showMessage = true;
                enemy.messageTimer = 120; // 2 seconds
            }
            
            // Update message timer
            if (enemy.showMessage) {
                enemy.messageTimer--;
                if (enemy.messageTimer <= 0) {
                    enemy.showMessage = false;
                }
            }
        }
        
        // Enemy collision with player
        if (!enemy.defeated &&
            player.x < enemy.x + enemy.width &&
            player.x + player.width > enemy.x &&
            player.y < enemy.y + enemy.height &&
            player.y + player.height > enemy.y) {
            
            // Check if player is jumping on enemy (landing on top)
            if (player.velocityY > 0 && player.y < enemy.y + 5) {
                // Player defeats enemy by jumping on it
                enemy.defeated = true;
                player.velocityY = -8; // Small bounce
            } else {
                // Player gets hurt
                lives--;
                if (lives <= 0) {
                    gameOver();
                } else {
                    // Respawn player
                    player.x = 50;
                    player.y = 300;
                    player.velocityX = 0;
                    player.velocityY = 0;
                    updateUI();
                }
            }
        }
    }
    
    // Check door collision (only if unlocked)
    if (endDoor.unlocked &&
        player.x < endDoor.x + endDoor.width &&
        player.x + player.width > endDoor.x &&
        player.y < endDoor.y + endDoor.height &&
        player.y + player.height > endDoor.y) {
        victory();
    }
    
    // Update speech bubble timer
    if (showSpeechBubble) {
        speechBubbleTimer--;
        if (speechBubbleTimer <= 0) {
            showSpeechBubble = false;
        }
    }
}

// Render game
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Yorkshire Dales background
    // Sky gradient
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.6);
    skyGradient.addColorStop(0, '#87ceeb');
    skyGradient.addColorStop(1, '#b0e0e6');
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height * 0.6);
    
    // Rolling hills (Yorkshire Dales style)
    ctx.fillStyle = '#228b22'; // Forest green
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.5);
    ctx.bezierCurveTo(200, canvas.height * 0.3, 400, canvas.height * 0.4, 600, canvas.height * 0.2);
    ctx.bezierCurveTo(700, canvas.height * 0.15, 800, canvas.height * 0.25, 800, canvas.height * 0.25);
    ctx.lineTo(800, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();
    
    // Second layer of hills (lighter green)
    ctx.fillStyle = '#32cd32';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.7);
    ctx.bezierCurveTo(150, canvas.height * 0.5, 350, canvas.height * 0.6, 550, canvas.height * 0.4);
    ctx.bezierCurveTo(650, canvas.height * 0.35, 750, canvas.height * 0.5, 800, canvas.height * 0.45);
    ctx.lineTo(800, canvas.height);
    ctx.lineTo(0, canvas.height);
    ctx.fill();
    
    // Add some stone walls (typical of Yorkshire Dales)
    ctx.strokeStyle = '#696969';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(100, canvas.height * 0.8);
    ctx.lineTo(300, canvas.height * 0.75);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(500, canvas.height * 0.7);
    ctx.lineTo(700, canvas.height * 0.65);
    ctx.stroke();
    
    // Draw platforms
    ctx.fillStyle = '#8b4513';
    for (let platform of platforms) {
        ctx.fillRect(platform.x, platform.y, platform.width, platform.height);
        
        // Add platform texture
        ctx.fillStyle = '#654321';
        ctx.fillRect(platform.x, platform.y, platform.width, 3);
        ctx.fillStyle = '#8b4513';
    }
    
    // Draw words
    ctx.font = '10px Georgia';
    ctx.textAlign = 'center';
    for (let word of words) {
        if (!word.collected) {
            // Word background
            ctx.fillStyle = '#ffd700';
            ctx.fillRect(word.x, word.y, word.width, word.height);
            
            // Word border
            ctx.strokeStyle = '#ffb000';
            ctx.lineWidth = 2;
            ctx.strokeRect(word.x, word.y, word.width, word.height);
            
            // Word text
            ctx.fillStyle = '#8b4513';
            ctx.fillText(word.word, word.x + word.width / 2, word.y + word.height - 5);
        }
    }
    
    // Draw enemies (blonde model agents)
    for (let enemy of enemies) {
        if (!enemy.defeated) {
            // Body (sleek professional outfit)
            ctx.fillStyle = '#000000'; // Black professional outfit
            ctx.fillRect(enemy.x + 4, enemy.y + 12, 17, 13);
            
            // Head (circular)
            ctx.fillStyle = '#ffdbac'; // Skin color
            ctx.beginPath();
            ctx.arc(enemy.x + 12.5, enemy.y + 8, 7, 0, Math.PI * 2);
            ctx.fill();
            
            // Blonde hair (voluminous)
            ctx.fillStyle = '#ffd700'; // Blonde hair
            ctx.fillRect(enemy.x + 5, enemy.y + 1, 15, 10);
            ctx.fillRect(enemy.x + 3, enemy.y + 5, 19, 6); // Voluminous styling
            
            // Eyes (more prominent)
            ctx.fillStyle = '#87ceeb'; // Blue eyes
            ctx.fillRect(enemy.x + 8, enemy.y + 6, 2, 2);
            ctx.fillRect(enemy.x + 14, enemy.y + 6, 2, 2);
            
            // Pupils
            ctx.fillStyle = '#000000';
            ctx.fillRect(enemy.x + 8.5, enemy.y + 6.5, 1, 1);
            ctx.fillRect(enemy.x + 14.5, enemy.y + 6.5, 1, 1);
            
            // Lipstick (red lips)
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(enemy.x + 10, enemy.y + 10, 5, 1.5);
            
            // Arms (more refined)
            ctx.fillStyle = '#ffdbac';
            ctx.fillRect(enemy.x + 1, enemy.y + 14, 4, 8);
            ctx.fillRect(enemy.x + 20, enemy.y + 14, 4, 8);
            
            // Corporate speak bubble
            if (enemy.showMessage) {
                const msgX = enemy.x - 30;
                const msgY = enemy.y - 25;
                const msgWidth = 80;
                const msgHeight = 20;
                
                // Message background
                ctx.fillStyle = '#ffffff';
                ctx.roundRect(msgX, msgY, msgWidth, msgHeight, 8);
                ctx.fill();
                
                // Message border
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 1;
                ctx.stroke();
                
                // Message text
                ctx.fillStyle = '#333333';
                ctx.font = '8px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(enemy.message, msgX + msgWidth/2, msgY + msgHeight/2 + 2);
            }
        }
    }
    
    // Draw end door
    if (endDoor.unlocked) {
        ctx.fillStyle = '#8b4513'; // Brown door
    } else {
        ctx.fillStyle = '#654321'; // Darker brown (locked)
    }
    ctx.fillRect(endDoor.x, endDoor.y, endDoor.width, endDoor.height);
    
    // Door details
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.strokeRect(endDoor.x, endDoor.y, endDoor.width, endDoor.height);
    
    // Door handle
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(endDoor.x + 32, endDoor.y + 30, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Door status text
    ctx.font = '10px Georgia';
    ctx.fillStyle = endDoor.unlocked ? '#00ff00' : '#ff0000';
    ctx.textAlign = 'center';
    ctx.fillText(endDoor.unlocked ? 'EXIT' : 'LOCKED', endDoor.x + 20, endDoor.y - 5);
    
    // Draw player (realistic female author)
    // Body (more realistic proportions)
    ctx.fillStyle = player.outfitColor;
    ctx.roundRect(player.x + 6, player.y + 18, 18, 22, 3);
    ctx.fill();
    
    // Head (realistic proportions)
    ctx.fillStyle = '#ffdbac'; // Skin color
    ctx.beginPath();
    ctx.arc(player.x + 15, player.y + 12, 9, 0, Math.PI * 2);
    ctx.fill();
    
    // Neck
    ctx.fillRect(player.x + 12, player.y + 18, 6, 4);
    
    // Hair (realistic red hair with texture)
    ctx.fillStyle = player.hairColor;
    ctx.beginPath();
    ctx.arc(player.x + 15, player.y + 8, 11, 0, Math.PI);
    ctx.fill();
    
    // Hair sides and back
    ctx.fillRect(player.x + 4, player.y + 8, 22, 12);
    
    // Hair texture lines
    ctx.strokeStyle = '#cc3300';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(player.x + 6 + i * 4, player.y + 5);
        ctx.lineTo(player.x + 8 + i * 4, player.y + 15);
        ctx.stroke();
    }
    
    // Eyes (realistic)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(player.x + 11, player.y + 10, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(player.x + 19, player.y + 10, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Irises (brown eyes)
    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(player.x + 11, player.y + 10, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 19, player.y + 10, 1.2, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(player.x + 11, player.y + 10, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 19, player.y + 10, 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // Eyebrows
    ctx.strokeStyle = '#8b4513';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + 8, player.y + 7);
    ctx.lineTo(player.x + 14, player.y + 6);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(player.x + 16, player.y + 6);
    ctx.lineTo(player.x + 22, player.y + 7);
    ctx.stroke();
    
    // Nose
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(player.x + 15, player.y + 11);
    ctx.lineTo(player.x + 15, player.y + 13);
    ctx.stroke();
    
    // Mouth (gentle smile)
    ctx.strokeStyle = '#d4a574';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(player.x + 15, player.y + 15, 3, 0, Math.PI);
    ctx.stroke();
    
    // Arms (realistic proportions)
    ctx.fillStyle = '#ffdbac';
    ctx.beginPath();
    ctx.arc(player.x + 3, player.y + 24, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 27, player.y + 24, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Forearms
    ctx.fillRect(player.x + 1, player.y + 21, 3, 6);
    ctx.fillRect(player.x + 26, player.y + 21, 3, 6);
    
    // Legs (visible below outfit)
    ctx.fillStyle = '#ffdbac';
    ctx.fillRect(player.x + 8, player.y + 38, 4, 2);
    ctx.fillRect(player.x + 18, player.y + 38, 4, 2);
    
    // Pen in hand (realistic)
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x + 27, player.y + 24);
    ctx.lineTo(player.x + 33, player.y + 18);
    ctx.stroke();
    
    // Pen tip
    ctx.fillStyle = '#0000ff';
    ctx.beginPath();
    ctx.arc(player.x + 33, player.y + 18, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    // Speech bubble (self-doubt)
    if (showSpeechBubble) {
        const bubbleX = player.x + 35;
        const bubbleY = player.y - 25;
        const bubbleWidth = 100;
        const bubbleHeight = 20;
        
        // Bubble background
        ctx.fillStyle = '#ffffff';
        ctx.roundRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight, 10);
        ctx.fill();
        
        // Bubble border
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Bubble pointer
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(bubbleX + 10, bubbleY + bubbleHeight);
        ctx.lineTo(bubbleX, bubbleY + bubbleHeight + 10);
        ctx.lineTo(bubbleX + 20, bubbleY + bubbleHeight);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Speech text
        ctx.fillStyle = '#666666';
        ctx.font = '10px Georgia';
        ctx.textAlign = 'center';
        ctx.fillText(speechBubbleText, bubbleX + bubbleWidth/2, bubbleY + bubbleHeight/2 + 3);
    }
}

// Update UI elements
function updateUI() {
    wordCountElement.textContent = wordsCollected;
    livesElement.textContent = lives;
}

// Game over
function gameOver() {
    gameRunning = false;
    gameOverText.textContent = 'The story remains unfinished...';
    gameOverDiv.classList.remove('hidden');
}

// Victory
function victory() {
    gameRunning = false;
    gameOverText.textContent = 'Congratulations! You found your confidence and completed your book!';
    gameOverDiv.classList.remove('hidden');
}

// Game loop
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// Restart game
restartBtn.addEventListener('click', initGame);

// Initialize and start game
initGame();
gameLoop();

