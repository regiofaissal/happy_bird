class FlappyBird {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        this.setupCanvasSize();
        window.addEventListener('resize', () => this.setupCanvasSize());

        this.bird = {
            x: 150,
            y: 300,
            width: 35,
            height: 35,
            velocity: 0,
            gravity: 0.15,
            jump: -2.5,
            maxVelocity: 7,  // Adicionado velocidade máxima
            rotation: 0
        };

        this.pipes = [];
        this.pipeWidth = 80;
        this.pipeGap = 180;
        this.pipeSpeed = 3;
        this.timeSinceLastPipe = 0;
        this.pipeInterval = 2500;

        this.score = 0;
        this.highScore = localStorage.getItem('flappyHighScore') || 0;
        // Adicionar atualização inicial do high score
        document.getElementById('highScore').textContent = this.highScore;

        this.gameActive = false;
        this.lastTime = 0;

        this.startButton = {
            x: this.canvas.width / 2 - 100,
            y: this.canvas.height / 2 - 25,
            width: 200,
            height: 50,
            visible: true
        };

        this.clouds = Array.from({ length: 5 }, () => ({
            x: Math.random() * this.canvas.width,
            y: Math.random() * (this.canvas.height / 2),
            size: 20 + Math.random() * 40,
            speed: 0.5 + Math.random() * 0.5
        }));

        this.setupEventListeners();
        this.startGameLoop();

        this.sounds = {
            jump: new Audio('sounds/jump.wav'),
            collision: new Audio('sounds/collision.wav'),
            point: new Audio('sounds/point.wav'),
            start: new Audio('sounds/start.wav')
        };

        this.setupEventListeners();
        this.startGameLoop();

        // Add after the sounds object
        this.backgroundMusic = new Audio('sounds/background-music.mp3');
        this.backgroundMusic.loop = true;
        this.backgroundMusic.volume = 0.5; // Set volume to 50%
        
        this.setupEventListeners();
        this.startGameLoop();

    }

    setupCanvasSize() {
        const maxWidth = Math.min(800, window.innerWidth * 0.9);
        const maxHeight = Math.min(600, window.innerHeight * 0.7);
        const aspectRatio = 800 / 600;

        if (maxWidth / maxHeight > aspectRatio) {
            this.canvas.height = maxHeight;
            this.canvas.width = maxHeight * aspectRatio;
        } else {
            this.canvas.width = maxWidth;
            this.canvas.height = maxWidth / aspectRatio;
        }

        if (this.startButton) {
            this.startButton.x = this.canvas.width / 2 - 100;
            this.startButton.y = this.canvas.height / 2 - 25;
        }

        this.scale = this.canvas.width / 800;
        this.pipeWidth = 80 * this.scale;
        this.pipeGap = 180 * this.scale;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Enter' && this.startButton.visible) {
                this.resetGame();
                this.startButton.visible = false;
            } else if ((e.code === 'Space' || e.code === 'ArrowUp') && this.gameActive) {
                e.preventDefault();
                this.birdJump();
            }
        });

        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            const clickX = (e.clientX - rect.left) * scaleX;
            const clickY = (e.clientY - rect.top) * scaleY;

            if (this.startButton.visible &&
                clickX >= this.startButton.x &&
                clickX <= this.startButton.x + this.startButton.width &&
                clickY >= this.startButton.y &&
                clickY <= this.startButton.y + this.startButton.height) {
                this.resetGame();
                this.startButton.visible = false;
            } else if (this.gameActive) {
                this.birdJump();
            }
        });
    }

    birdJump() {
        this.bird.velocity = this.bird.jump;
        this.bird.rotation = -0.5;
        this.sounds.jump.currentTime = 0;
        this.sounds.jump.play();
    }

    createPipe() {
        const minHeight = 100 * this.scale;
        const maxHeight = this.canvas.height - this.pipeGap - minHeight;
        const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;

        this.pipes.push({
            x: this.canvas.width,
            y: 0,
            width: this.pipeWidth,
            height: topHeight,
            passed: false,
            isTop: true
        });

        this.pipes.push({
            x: this.canvas.width,
            y: topHeight + this.pipeGap,
            width: this.pipeWidth,
            height: this.canvas.height - (topHeight + this.pipeGap),
            passed: false,
            isTop: false
        });
    }

    updatePipes(deltaTime) {
        this.timeSinceLastPipe += deltaTime;

        if (this.timeSinceLastPipe > this.pipeInterval) {
            this.createPipe();
            this.timeSinceLastPipe = 0;
        }

        this.pipes.forEach(pipe => {
            pipe.x -= this.pipeSpeed * this.scale;
        });

        this.pipes = this.pipes.filter(pipe => pipe.x + pipe.width > -50);
    }

    updateClouds() {
        this.clouds.forEach(cloud => {
            cloud.x -= cloud.speed * this.scale;
            if (cloud.x + cloud.size < 0) {
                cloud.x = this.canvas.width + cloud.size;
                cloud.y = Math.random() * (this.canvas.height / 2);
            }
        });
    }

    checkCollision(pipe) {
        return this.bird.x < pipe.x + pipe.width &&
            this.bird.x + this.bird.width > pipe.x &&
            this.bird.y < pipe.y + pipe.height &&
            this.bird.y + this.bird.height > pipe.y;
    }

    updateScore() {
        this.pipes.forEach(pipe => {
            if (pipe.isTop && !pipe.passed && pipe.x + pipe.width < this.bird.x) {
                pipe.passed = true;
                this.score++;
                this.sounds.point.currentTime = 0;
                this.sounds.point.play();
                document.getElementById('score').textContent = this.score;

                if (this.score > this.highScore) {
                    this.highScore = this.score;
                    localStorage.setItem('flappyHighScore', this.highScore);
                    document.getElementById('highScore').textContent = this.highScore;
                }
            }
        });
    }

    update(currentTime) {
        if (!this.gameActive) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Limitando a velocidade máxima de queda
        this.bird.velocity = Math.min(
            this.bird.maxVelocity,
            this.bird.velocity + this.bird.gravity * this.scale
        );
        this.bird.y += this.bird.velocity;

        this.bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, this.bird.velocity * 0.1));

        this.updateClouds();
        this.updatePipes(deltaTime);

        if (this.bird.y + this.bird.height > this.canvas.height || this.bird.y < 0) {
            this.gameOver();
            return;
        }

        for (let pipe of this.pipes) {
            if (this.checkCollision(pipe)) {
                this.gameOver();
                return;
            }
        }

        this.updateScore();
    }

    gameOver() {
        this.gameActive = false;
        this.startButton.visible = true;
        this.sounds.collision.currentTime = 0;
        this.sounds.collision.play();
        this.backgroundMusic.pause();
        this.backgroundMusic.currentTime = 0;
    }

    resetGame() {
        const birdSize = 35 * this.scale;
        this.bird = {
            x: 150 * this.scale,
            y: this.canvas.height / 2,
            width: birdSize,
            height: birdSize,
            velocity: 0,
            gravity: 0.15 * this.scale,
            jump: -2.5 * this.scale,
            maxVelocity: 7 * this.scale,  // Adicionando velocidade máxima
            rotation: 0
        };

        this.pipes = [];
        this.score = 0;
        this.timeSinceLastPipe = 0;
        this.gameActive = true;
        this.lastTime = performance.now();
        this.sounds.start.currentTime = 0;
        this.sounds.start.play();
        this.backgroundMusic.play();

        document.getElementById('score').textContent = '0';
        document.getElementById('highScore').textContent = this.highScore;  // Adicionar esta linha
    }

    draw() {
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#73C2FB');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.clouds.forEach(cloud => {
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(cloud.x, cloud.y, cloud.size * this.scale, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.pipes.forEach(pipe => {
            const pipeGradient = this.ctx.createLinearGradient(pipe.x, 0, pipe.x + pipe.width, 0);
            pipeGradient.addColorStop(0, '#2ecc71');
            pipeGradient.addColorStop(1, '#27ae60');

            this.ctx.fillStyle = pipeGradient;
            this.ctx.fillRect(pipe.x, pipe.y, pipe.width, pipe.height);

            this.ctx.strokeStyle = '#229954';
            this.ctx.lineWidth = 3 * this.scale;
            this.ctx.strokeRect(pipe.x, pipe.y, pipe.width, pipe.height);
        });

        this.ctx.save();
        this.ctx.translate(this.bird.x + this.bird.width / 2, this.bird.y + this.bird.height / 2);
        this.ctx.rotate(this.bird.rotation);

        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, this.bird.width / 2, this.bird.height / 2, 0, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#FFA500';
        this.ctx.beginPath();
        this.ctx.ellipse(-5 * this.scale, 0, this.bird.width / 3, this.bird.height / 4, Math.PI / 4, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'white';
        this.ctx.beginPath();
        this.ctx.arc(8 * this.scale, -5 * this.scale, 6 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = 'black';
        this.ctx.beginPath();
        this.ctx.arc(8 * this.scale, -5 * this.scale, 3 * this.scale, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();

        if (this.startButton.visible) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#e74c3c';
            this.ctx.fillRect(
                this.startButton.x,
                this.startButton.y,
                this.startButton.width,
                this.startButton.height
            );

            this.ctx.strokeStyle = '#c0392b';
            this.ctx.lineWidth = 2;
            this.ctx.strokeRect(
                this.startButton.x,
                this.startButton.y,
                this.startButton.width,
                this.startButton.height
            );

            this.ctx.fillStyle = 'white';
            this.ctx.font = `${24 * this.scale}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            const buttonText = this.score > 0 ? 'Try Again' : 'Start Game';
            this.ctx.fillText(
                buttonText,
                this.startButton.x + this.startButton.width / 2,
                this.startButton.y + this.startButton.height / 2
            );
        }
    }

    startGameLoop() {
        const gameLoop = (currentTime) => {
            this.update(currentTime);
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        requestAnimationFrame(gameLoop);
    }
}

window.onload = () => {
    new FlappyBird();
};