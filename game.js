const emojis = ['🐙','⭐','🚀','🐱','🍕','🎮','🌈','🍦','⚽'];
let selectedPin = "";
let playerName = "";
let selectedMode = "";
let baseSpeed = 60;
let currentSpeed = 60;
let score = 0;
let lastTenResults = [];
let targetData = null; 
let currentLetterIndex = 0;
let timeLeft = 60;
let timerEvent;
let isGameOver = false;
let wordList = [
    { 
        base: "run", past: "ran", future: "will run",
        sentence: "Yesterday, I ___ to the park." // ___ is the target tense
    },
    { 
        base: "swim", past: "swam", future: "will swim",
        sentence: "In summer, the fish ___ in the sea."
    },
    { 
        base: "catch", past: "caught", future: "will catch",
        sentence: "Tomorrow, he ___ a big fish!"
    }
];


document.addEventListener("DOMContentLoaded", () => {
    const grid = document.getElementById('emoji-grid');
    
    //emoji buttons
    emojis.forEach(e => {
        let div = document.createElement('div');
        div.className = 'emoji-item';
        div.innerText = e;
        div.onclick = () => selectEmoji(e);
        grid.appendChild(div);
    });

    //login
    document.getElementById('login-btn').onclick = () => {
        playerName = document.getElementById('nickname-input').value;
        
        if (playerName.length < 2 || selectedPin.length < 3) {
            alert("Please enter a name and 3 emojis!");
            return;
        }

        // switching pages
        navigateTo('mode-page');
    };
});

function selectEmoji(e) {
    let pinArray = [...selectedPin]; 
    //emoji amount
    if (pinArray.length < 3) {
        selectedPin += e;
        document.getElementById('pin-dots').innerText = selectedPin;
    }
}

function navigateTo(pageId) {
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    // show desired screen
    document.getElementById(pageId).style.display = 'flex';
}

function goToDifficulty(mode) {
    //difficulty
    console.log("Selected Mode:", mode);
    alert("Moving to " + mode + " difficulty selection...");
}

// function called from mode seletion
function goToDifficulty(mode) {
    selectedMode = mode;
    navigateTo('difficulty-page');
}

// funtion called from difficulty selection
function launchGame(speed) {
    baseSpeed = speed;
    
    // hide menu
    document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
    document.getElementById('game-container').style.display = 'block';

    new Phaser.Game(phaserConfig);
}

const phaserConfig = {
    type: Phaser.AUTO,
    width: 800, height: 600,
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scene: { preload: preload, create: create, update: update }
};

function preload() {
    this.load.json('wordsData', 'words.json');
    this.load.image('octopus', 'octopus.png');
    this.load.image('bubble', 'bubble.png');
    this.load.image('ocean', 'ocean.jpg');

    let graphics = this.make.graphics({x: 0, y: 0, add: false});
    graphics.lineStyle(2, 0xffffff, 1);
    graphics.fillStyle(0x70d6ff, 0.5);
    graphics.fillCircle(30, 30, 25);
    graphics.strokeCircle(30, 30, 25);
    
    
    // falling objects
    graphics.fillStyle(0xffffff, 1);
    graphics.generateTexture('target-bubble', 60, 60);
    graphics.generateTexture('target-past', 40, 40);
    graphics.clear();

    //bullets
    graphics.fillStyle(0x4ade80, 1);
    graphics.fillRect(0, 0, 8, 16);
    graphics.generateTexture('bullet', 8, 16);
}

function create() {
    let bg = this.add.image(400, 300, 'ocean');
    bg.setDisplaySize(800, 600);

    const data = this.cache.json.get('wordsData');
    this.wordList = data.wordBank;

    this.bullets = this.physics.add.group();
    this.targets = this.physics.add.group();

    // moving ocotopus
    this.player = this.physics.add.sprite(400, 500, 'octopus');
    this.player.setScale(0.2);
    this.player.setCollideWorldBounds(true);

    // HUD 
    this.scoreText = this.add.text(20, 20, 'Score: 0', { fontSize: '28px', fill: '#4ade80', fontStyle: 'bold', stroke: '#000', strokeThickness: 3});
    this.promptText = this.add.text(400, 100, '', { fontSize: '26px', fill: '#000000', fontStyle: 'bold', stroke: '#0000', strokeThickness: 5}).setOrigin(0.5);

    // collision logic
    this.physics.add.overlap(this.bullets, this.targets, (bullet, target) => {
        const isCorrect = target.getData('correct');
        bullet.destroy();
        handleHit(this, target, isCorrect);
    });

    // shoot on click
    this.input.on('pointerdown', () => {
        let b = this.bullets.create(this.player.x + 35, this.player.y - 40, 'bubble');
        b.setScale(0.2);
        b.setVelocityY(-600);
    });

    this.nextRound();
    this.time.addEvent({ delay: 2500, callback: () => spawnObject(this), loop: true });
    
    this.timerText = this.add.text(780, 20, 'Time: 60', {fontSize: '28px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000',strokeThickness: 3 }).setOrigin(1, 0);

    // timer
    timerEvent = this.time.addEvent({delay: 1000, callback: onTimerTick, callbackScope: this, loop: true});
}

function onTimerTick() {
    if (isGameOver) return;

    timeLeft--;
    this.timerText.setText('Time: ' + timeLeft);

    // colour changes when time is low
    if (timeLeft <= 10) {
        this.timerText.setFill('#ff7675');
    }

    if (timeLeft <= 0) {
        endRound(this);
    }
}

function endRound(scene) {
    isGameOver = true;
    timerEvent.remove(); 
    scene.physics.pause(); 

    // scoring system
    let starsEarned = 0;
    if (score >= 150) starsEarned = 5;
    else if (score >= 100) starsEarned = 4;
    else if (score >= 60) starsEarned = 3;
    else if (score >= 30) starsEarned = 2;
    else if (score > 0) starsEarned = 1;

    let overlay = scene.add.rectangle(400, 300, 800, 600, 0x002b5b, 0.85);
    let card = scene.add.rectangle(400, 300, 450, 400, 0x2d3436, 1).setStrokeStyle(4, 0x4ade80);

    scene.add.text(400, 180, 'MISSION COMPLETE!', { 
        fontSize: '40px', fill: '#4ade80', fontStyle: 'bold', fontFamily: 'Arial'
    }).setOrigin(0.5);

    // stars or empty circle
    for (let i = 0; i < 5; i++) {
        let starX = 280 + (i * 60);
        let starChar = (i < starsEarned) ? '⭐' : '🔘'; 
        let star = scene.add.text(starX, 280, starChar, { 
            fontSize: '45px',
            padding: { top: 15, bottom: 10 }
        }).setOrigin(0.5).setAlpha(0);
        
        scene.tweens.add({
            targets: star,
            alpha: 1,
            scale: { from: 0, to: 1 },
            delay: i * 150,
            duration: 400,
            ease: 'Back.easeOut'
        });
    }

    scene.add.text(400, 360, `Final Score: ${score}`, { 
        fontSize: '24px', fill: '#fff', fontFamily: 'Courier' 
    }).setOrigin(0.5);

    let btn = scene.add.rectangle(400, 440, 200, 60, 0x4ade80, 1).setInteractive({ useHandCursor: true });
    scene.add.text(400, 440, 'CONTINUE', { fontSize: '20px', fill: '#1a1a1a', fontStyle: 'bold' }).setOrigin(0.5);

    btn.on('pointerdown', () => {
        document.getElementById('game-container').style.display = 'none';
        navigateTo('next-action-page');
        } 
    );
}

    function restartLevel() {
        // Reset game variables
        score = 0;
        timeLeft = 60;
        isGameOver = false;
        navigateTo('none');
        document.getElementById('game-container').style.display = 'block';
        // Logic to restart the Phaser scene...
        window.location.reload(); // Simplest reset for demo purposes
    }

    function goToStart() {
        window.location.reload(); // Returns to Start Page
    }

function update() {
    this.player.x = Phaser.Math.Linear(this.player.x, this.input.x, 0.2); // Smooth follow
}

// game funtions
function handleHit(scene, target, isCorrect) {
    if (isCorrect) {
        
        score += 10;
        scene.scoreText.setText(`Score: ${score}`);

        scene.player.setTint(0x4ade80);
        scene.time.delayedCall(200, () => scene.player.clearTint());

        if (selectedMode === 'spelling') {
            currentLetterIndex++;
           
            if (currentLetterIndex >= targetData.base.length) {
                clearRemainingBubbles(scene); 
                scene.nextRound(); 
            }
        } else {
 
            clearRemainingBubbles(scene);
            scene.nextRound();
        }
        

        updateDifficulty(true);
        
    } else {
        
        updateDifficulty(false);
        target.setAlpha(0.2);
    }
    
    // always destroy the bullet and the specific bubble hit
    target.destroy();
}

function clearRemainingBubbles(scene) {
    scene.targets.clear(true, true); // removes all existing bubbles instantly
}

function spawnObject(scene) {
    if (isGameOver) return;

    let x = Phaser.Math.Between(100, 700);
    let target = scene.targets.create(x, -50, 'target-bubble');
    target.setVelocityY(currentSpeed);

    let val, isCorrect;

    if (selectedMode === 'spelling') {
        isCorrect = Math.random() > 0.5;
        val = isCorrect ? targetData.base[currentLetterIndex].toUpperCase() : "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[Phaser.Math.Between(0,25)];
    } else {
        let options = [targetData.past, targetData.base, targetData.future];
        val = Phaser.Utils.Array.GetRandom(options);
        isCorrect = (val === targetData.past);
    }

    target.setData('correct', isCorrect);
    let label = scene.add.text(x, -50, val, { 
        fontSize: '22px', color: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5);
    
    // update position
    scene.events.on('update', () => {
        if(target.active) { label.x = target.x; label.y = target.y; } 
        else { label.destroy(); }
    });
}

Phaser.Scene.prototype.nextRound = function() {
    currentLetterIndex = 0;
    targetData = Phaser.Utils.Array.GetRandom(wordList);
    
    let task = (selectedMode === 'spelling') ? 
        `SPELL: ${targetData.base.toUpperCase()}` : 
        targetData.sentence;
    
    this.promptText.setText(task);
    console.log("State Updated: Moving to next question.");
};


function updateDifficulty(isCorrect) {
    lastTenResults.push(isCorrect);
    if (lastTenResults.length > 10) lastTenResults.shift();
    if (lastTenResults.length === 10) {
        let acc = (lastTenResults.filter(r => r).length / 10) * 100;
        if (acc >= 90) currentSpeed += 20; // increase speed as they progress
        else if (acc <= 40) currentSpeed = Math.max(40, currentSpeed - 15); // reduce speed if they struggle
        lastTenResults = [];
    }
}