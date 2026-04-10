import { useEffect, useRef } from "react";

/**
 * Animated hero visual — a glowing cybersecurity brain/shield rendered
 * entirely with CSS + lightweight Canvas particles. No external images needed.
 */
export default function HeroAnimation() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Particles
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      color: string;
      life: number;
      maxLife: number;
    }

    const particles: Particle[] = [];
    const maxParticles = 80;
    const colors = [
      "rgba(34,197,94,",  // green-500
      "rgba(22,163,74,",  // green-600
      "rgba(74,222,128,", // green-400
      "rgba(16,185,129,", // emerald-500
    ];

    const createParticle = (): Particle => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      const cx = w / 2;
      const cy = h / 2;
      // Spawn from center area
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 60 + 20;
      return {
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 2.5 + 0.5,
        alpha: Math.random() * 0.8 + 0.2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 0,
        maxLife: Math.random() * 200 + 100,
      };
    };

    // Connection lines
    const drawConnections = (rect: DOMRect) => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.15;
            ctx.strokeStyle = `rgba(34,197,94,${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    // Orbiting rings
    let time = 0;
    const drawOrbitRings = (cx: number, cy: number) => {
      for (let r = 0; r < 3; r++) {
        const radius = 100 + r * 50;
        const alpha = 0.08 + Math.sin(time * 0.02 + r) * 0.04;
        ctx.strokeStyle = `rgba(34,197,94,${alpha})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius, radius * 0.4, time * 0.005 + r * 0.5, 0, Math.PI * 2);
        ctx.stroke();

        // Orbiting dot
        const dotAngle = time * 0.02 + r * 2;
        const dotX = cx + Math.cos(dotAngle) * radius;
        const dotY = cy + Math.sin(dotAngle) * (radius * 0.4);
        ctx.fillStyle = `rgba(34,197,94,${0.6 + Math.sin(time * 0.05) * 0.3})`;
        ctx.beginPath();
        ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    // Central glow
    const drawCentralGlow = (cx: number, cy: number) => {
      const pulseSize = 60 + Math.sin(time * 0.03) * 15;
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseSize);
      gradient.addColorStop(0, "rgba(34,197,94,0.3)");
      gradient.addColorStop(0.5, "rgba(34,197,94,0.08)");
      gradient.addColorStop(1, "rgba(34,197,94,0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseSize, 0, Math.PI * 2);
      ctx.fill();

      // Inner shield icon hint
      const shieldSize = 22 + Math.sin(time * 0.04) * 3;
      ctx.strokeStyle = `rgba(34,197,94,${0.5 + Math.sin(time * 0.03) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy - shieldSize);
      ctx.quadraticCurveTo(cx + shieldSize, cy - shieldSize * 0.6, cx + shieldSize * 0.8, cy);
      ctx.quadraticCurveTo(cx + shieldSize * 0.4, cy + shieldSize * 0.8, cx, cy + shieldSize);
      ctx.quadraticCurveTo(cx - shieldSize * 0.4, cy + shieldSize * 0.8, cx - shieldSize * 0.8, cy);
      ctx.quadraticCurveTo(cx - shieldSize, cy - shieldSize * 0.6, cx, cy - shieldSize);
      ctx.stroke();
    };

    // Data stream lines
    const drawDataStreams = (cx: number, cy: number) => {
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i + time * 0.008;
        const innerR = 70;
        const outerR = 180 + Math.sin(time * 0.02 + i) * 30;
        const x1 = cx + Math.cos(angle) * innerR;
        const y1 = cy + Math.sin(angle) * innerR;
        const x2 = cx + Math.cos(angle) * outerR;
        const y2 = cy + Math.sin(angle) * outerR;

        const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
        gradient.addColorStop(0, "rgba(34,197,94,0.4)");
        gradient.addColorStop(1, "rgba(34,197,94,0)");
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Endpoint node
        const nodeAlpha = 0.3 + Math.sin(time * 0.04 + i * 1.5) * 0.2;
        ctx.fillStyle = `rgba(34,197,94,${nodeAlpha})`;
        ctx.beginPath();
        ctx.arc(x2, y2, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(34,197,94,${nodeAlpha * 0.5})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x2, y2, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
    };

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      const cx = w / 2;
      const cy = h / 2;

      // Add particles
      while (particles.length < maxParticles) {
        particles.push(createParticle());
      }

      // Update & draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;

        const lifeRatio = p.life / p.maxLife;
        const fadeAlpha = lifeRatio < 0.1 ? lifeRatio * 10 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;
        const currentAlpha = p.alpha * fadeAlpha;

        if (p.life >= p.maxLife || p.x < 0 || p.x > w || p.y < 0 || p.y > h) {
          particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = `${p.color}${currentAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      drawConnections(rect);
      drawOrbitRings(cx, cy);
      drawDataStreams(cx, cy);
      drawCentralGlow(cx, cy);

      time++;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="relative w-full aspect-square max-w-[500px] mx-auto">
      {/* Outer glow */}
      <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl animate-pulse" />
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: "block" }}
      />
      {/* Center label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p className="text-[10px] font-mono text-primary/60 tracking-[0.3em] uppercase">
            IA + Suporte Humano
          </p>
        </div>
      </div>
    </div>
  );
}
