import React, { useEffect, useRef } from 'react';

export const CursorTrail: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    const points: { x: number; y: number; life: number; color: string; size: number; velocityX: number; velocityY: number }[] = [];
    // Vibrant colors for the trail (Blue, Purple, Pink, Emerald, Yellow)
    const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#eab308'];

    let mouse = { x: -100, y: -100 };
    let lastMouse = { x: -100, y: -100 };

    const handleMouseMove = (e: MouseEvent) => {
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      
      // Calculate distance moved
      const dx = mouse.x - lastMouse.x;
      const dy = mouse.y - lastMouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Add points based on distance to make a smooth continuous trail
      const steps = Math.max(1, Math.floor(dist / 15));
      for (let i = 0; i < steps; i++) {
        const x = lastMouse.x + (dx * i) / steps;
        const y = lastMouse.y + (dy * i) / steps;
        
        // Add 1 particle per step for a lighter bubble effect
        points.push({
          x: x + (Math.random() - 0.5) * 6,
          y: y + (Math.random() - 0.5) * 6,
          life: 1,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 6 + 3, // Slightly smaller bubbles
          velocityX: (Math.random() - 0.5) * 0.5,
          velocityY: (Math.random() - 0.5) * 0.5 - 0.5 // Initial upward drift
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        
        // Bubble stroke
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = p.life;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.stroke();
        
        // Bubble slight fill
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life * 0.2;
        ctx.fill();
        
        // Update particle physics (bubbles float up)
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.velocityY -= 0.02; // Accelerate upwards slightly
        p.life -= 0.08; // Much faster fade out for a short trail
      }
      
      // Remove dead points
      while (points.length > 0 && points[0].life <= 0) {
        points.shift();
      }
      
      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[99999]"
    />
  );
};
