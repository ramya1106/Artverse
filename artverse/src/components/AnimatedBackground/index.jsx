// Animated background behind the whole site. Floating dots are joined by thin lines when they
// are close to each other. It is drawn on a plain canvas, so no extra library is needed.

import { useEffect, useRef } from 'react';
import styled from 'styled-components';

const Canvas = styled.canvas`
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: 0;
  pointer-events: none;
  opacity: 0.55;
`;

const CONFIG = {
  PARTICLE_COUNT:   88,
  CONNECTION_DIST:  160,  // dots closer than this (in px) get a line between them
  PARTICLE_SPEED:   0.28,
  MIN_RADIUS:       1.2,
  MAX_RADIUS:       3.2,
};

class Particle {
  constructor(w, h) {
    this.reset(w, h);
  }

  reset(w, h) {
    this.x  = Math.random() * w;
    this.y  = Math.random() * h;
    this.vx = (Math.random() - 0.5) * CONFIG.PARTICLE_SPEED * 2;
    this.vy = (Math.random() - 0.5) * CONFIG.PARTICLE_SPEED * 2;
    this.r  = CONFIG.MIN_RADIUS + Math.random() * (CONFIG.MAX_RADIUS - CONFIG.MIN_RADIUS);
    // 1 in 5 dots is red, the rest are dim white
    this.isRed = Math.random() < 0.2;
    // Each dot pulses at its own pace
    this.phase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 0.012 + Math.random() * 0.018;
  }

  update(w, h) {
    this.x += this.vx;
    this.y += this.vy;
    this.phase += this.pulseSpeed;

    // Bounce off the screen edges
    if (this.x < 0 || this.x > w) this.vx *= -1;
    if (this.y < 0 || this.y > h) this.vy *= -1;

    // Keep it on screen after a bounce
    this.x = Math.max(0, Math.min(w, this.x));
    this.y = Math.max(0, Math.min(h, this.y));
  }

  draw(ctx) {
    const pulse = 0.6 + 0.4 * Math.sin(this.phase); // between 0.6 and 1
    const radius = this.r * (0.85 + 0.15 * pulse);

    if (this.isRed) {
      // Red dot with a soft glow
      const grd = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, radius * 4);
      grd.addColorStop(0,   `rgba(192, 57, 43, ${0.9 * pulse})`);
      grd.addColorStop(0.4, `rgba(122, 26, 16, ${0.5 * pulse})`);
      grd.addColorStop(1,   'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius * 4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220, 80, 60, ${pulse})`;
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 * pulse})`;
      ctx.fill();
    }
  }
}

const AnimatedBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    let w, h, particles, raf;

    const init = () => {
      w = canvas.width  = window.innerWidth;
      h = canvas.height = window.innerHeight;
      particles = Array.from({ length: CONFIG.PARTICLE_COUNT }, () => new Particle(w, h));
    };

    const drawConnections = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONFIG.CONNECTION_DIST) {
            const opacity = (1 - dist / CONFIG.CONNECTION_DIST) * 0.45;
            const isRedConn = a.isRed || b.isRed;

            if (isRedConn) {
              // Lines touching a red dot are a bit brighter
              const grd = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
              grd.addColorStop(0, `rgba(192, 57, 43, ${opacity * 1.4})`);
              grd.addColorStop(1, `rgba(122, 26, 16, ${opacity * 0.6})`);
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = grd;
              ctx.lineWidth = 0.8;
              ctx.stroke();
            } else {
              ctx.beginPath();
              ctx.moveTo(a.x, a.y);
              ctx.lineTo(b.x, b.y);
              ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.5})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        }
      }
    };

    const draw = () => {
      // A see-through black fill instead of clearing, which leaves a faint trail behind the dots
      ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
      ctx.fillRect(0, 0, w, h);

      drawConnections();
      particles.forEach(p => { p.update(w, h); p.draw(ctx); });

      raf = requestAnimationFrame(draw);
    };

    init();
    draw();
    // Resizing rebuilds the canvas and the dots for the new screen size
    window.addEventListener('resize', init);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', init);
    };
  }, []);

  return <Canvas ref={canvasRef} aria-hidden="true" />;
};

export default AnimatedBackground;