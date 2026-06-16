/**
 * Jobby Markdown Editor - fireworks.js
 * Loading success celebration fireworks canvas animation.
 */

export function startOpeningFireworks() {
    const canvas = document.createElement('canvas');
    canvas.id = 'opening-fireworks-canvas';
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.zIndex = '99999';
    canvas.style.pointerEvents = 'none';
    canvas.style.transition = 'opacity 1s ease';
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    class Particle {
        constructor(x, y, color) {
            this.x = x;
            this.y = y;
            this.color = color;
            this.radius = Math.random() * 2.5 + 1;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 6 + 2;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.gravity = 0.12;
            this.alpha = 1;
            this.decay = Math.random() * 0.015 + 0.01;
        }

        draw() {
            ctx.save();
            ctx.globalAlpha = this.alpha;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.restore();
        }

        update() {
            this.vx *= 0.98;
            this.vy *= 0.98;
            this.vy += this.gravity;
            this.x += this.vx;
            this.y += this.vy;
            this.alpha -= this.decay;
        }
    }

    class Firework {
        constructor() {
            this.x = Math.random() * width;
            this.y = height;
            this.targetY = Math.random() * (height * 0.5);
            this.vy = -(Math.random() * 5 + 12);
            this.color = `hsl(${Math.random() * 360}, 100%, 65%)`;
            this.exploded = false;
            this.particles = [];
        }

        update() {
            if (!this.exploded) {
                this.y += this.vy;
                this.vy += 0.08;
                if (this.vy >= 0 || this.y <= this.targetY) {
                    this.explode();
                }
            } else {
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.update();
                    if (p.alpha <= 0) {
                        this.particles.splice(i, 1);
                    }
                }
            }
        }

        explode() {
            this.exploded = true;
            const count = Math.random() * 40 + 60;
            for (let i = 0; i < count; i++) {
                this.particles.push(new Particle(this.x, this.y, this.color));
            }
        }

        draw() {
            if (!this.exploded) {
                ctx.beginPath();
                ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = this.color;
                ctx.fill();
            } else {
                this.particles.forEach(p => p.draw());
            }
        }
    }

    const fireworks = [];
    let isRunning = true;
    let animationFrameId;

    const launchInterval = setInterval(() => {
        if (fireworks.length < 5) {
            fireworks.push(new Firework());
        }
    }, 350);

    function loop() {
        if (!isRunning && fireworks.length === 0) return;
        animationFrameId = requestAnimationFrame(loop);
        ctx.clearRect(0, 0, width, height);

        for (let i = fireworks.length - 1; i >= 0; i--) {
            const f = fireworks[i];
            f.update();
            f.draw();
            if (f.exploded && f.particles.length === 0) {
                fireworks.splice(i, 1);
            }
        }
    }

    loop();

    setTimeout(() => {
        clearInterval(launchInterval);
        isRunning = false;
        canvas.style.opacity = '0';
        setTimeout(() => {
            cancelAnimationFrame(animationFrameId);
            canvas.remove();
        }, 1000);
    }, 3000);
}
