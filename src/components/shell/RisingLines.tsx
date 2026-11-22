'use client';

import { useEffect, useRef } from 'react';

/**
 * Decoration: thin lines of light rising from a glowing horizon at the canvas's bottom edge (DECISIONS D-036).
 * Our own code on a 2D canvas, no dependency. Hidden from assistive technology and never focusable.
 * It animates only while on screen. With prefers-reduced-motion it draws one still frame.
 * The colour is the `--color-lime` design token.
 */

type Line = { x: number; y: number; speed: number; length: number; alpha: number; width: number };

const LIME_FALLBACK: Rgb = [217, 254, 143]; // #d9fe8f
const MAX_DPR = 2;
const MAX_STEP_S = 0.05; // after a pause, move at most one short step instead of jumping

type Rgb = [number, number, number];

export function RisingLines({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const [r, g, b] = parseHex(getComputedStyle(canvas).getPropertyValue('--color-lime')) ?? LIME_FALLBACK;
    const rgba = (a: number) => `rgba(${r},${g},${b},${a.toFixed(3)})`;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');

    let w = 0;
    let h = 0;
    let lines: Line[] = [];
    let frame = 0;
    let last = 0;
    let onScreen = false;

    // A new line starts at the horizon. On a resize or a still frame, lines are spread over the whole height.
    const spawn = (anywhere: boolean): Line => {
      const x = Math.random() * w;
      const edge = Math.sin((x / w) * Math.PI); // 0 at the sides, 1 in the middle
      return {
        x,
        y: anywhere ? Math.random() * h : h,
        speed: h * (0.12 + Math.random() * 0.3),
        length: h * (0.12 + Math.random() * 0.3),
        alpha: (0.45 + Math.random() * 0.55) * (0.35 + 0.65 * edge),
        width: Math.random() < 0.2 ? 2 : 1,
      };
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);

      // The glow: an ellipse centred on the horizon.
      ctx.save();
      ctx.translate(w / 2, h);
      ctx.scale(w * 0.6, h * 0.85);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glow.addColorStop(0, rgba(0.4));
      glow.addColorStop(0.35, rgba(0.12));
      glow.addColorStop(1, rgba(0));
      ctx.fillStyle = glow;
      ctx.fillRect(-1, -1, 2, 1);
      ctx.restore();

      // The lines: bright at the head, fading toward the horizon, and dimmer the higher they climb.
      for (const l of lines) {
        const fade = Math.min(1, Math.max(0, l.y / h)) ** 0.6;
        if (fade <= 0) continue;
        const tail = Math.min(h, l.y + l.length);
        const grad = ctx.createLinearGradient(0, l.y, 0, tail);
        grad.addColorStop(0, rgba(l.alpha * fade));
        grad.addColorStop(1, rgba(0));
        ctx.fillStyle = grad;
        ctx.fillRect(l.x, l.y, l.width, tail - l.y);
      }

      // The horizon itself: a hairline, brightest in the middle.
      const line = ctx.createLinearGradient(0, 0, w, 0);
      line.addColorStop(0, rgba(0.15));
      line.addColorStop(0.5, rgba(1));
      line.addColorStop(1, rgba(0.15));
      ctx.fillStyle = line;
      ctx.fillRect(0, h - 1, w, 1);
    };

    const step = (dt: number) => {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        l.y -= l.speed * dt;
        if (l.y + l.length < 0) lines[i] = spawn(false);
      }
    };

    const tick = (now: number) => {
      step(Math.min((now - last) / 1000, MAX_STEP_S));
      last = now;
      draw();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (frame || !onScreen || motion.matches) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const resize = () => {
      const box = canvas.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      w = box.width;
      h = box.height;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(110, Math.max(16, w / 14)));
      lines = Array.from({ length: count }, () => spawn(true));
      draw();
    };

    const onMotionChange = () => {
      if (motion.matches) {
        stop();
        draw();
      } else {
        start();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting;
      if (onScreen) start();
      else stop();
    });
    visibility.observe(canvas);
    motion.addEventListener('change', onMotionChange);

    return () => {
      stop();
      resizeObserver.disconnect();
      visibility.disconnect();
      motion.removeEventListener('change', onMotionChange);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className={className} />;
}

function parseHex(value: string): Rgb | null {
  const hex = value.trim().replace(/^#/, '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  if (!/^[0-9a-f]{6}$/i.test(full)) return null;
  const n = Number.parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
