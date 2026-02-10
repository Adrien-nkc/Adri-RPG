import React, { useRef, useEffect, useState } from "react";
import { Player, GameObject, GameScene, PixelSprite, Vector2, Projectile, VisualEffect } from "../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE } from "../constants";

interface GameCanvasProps {
  player: Player;
  objects: GameObject[];
  scene: GameScene;
  bgColor: string;
  width: number;
  height: number;
  /** Optional full-room background image URL (drawn behind everything). */
  bgImage?: string;
  equippedItem?: string;
  onCanvasClick?: (canvasX: number, canvasY: number) => void;
  shotLines?: { from: Vector2; to: Vector2; createdAt: number }[] | null;
  targetsShot?: string[];
  projectiles?: Projectile[];
  effects?: VisualEffect[];
  hitFlash?: boolean;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  player,
  objects,
  scene,
  bgColor,
  width,
  height,
  bgImage,
  equippedItem,
  onCanvasClick,
  shotLines,
  targetsShot = [],
  projectiles = [],
  effects = [],
  hitFlash = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const [bgImageLoaded, setBgImageLoaded] = useState(false);
  useEffect(() => {
    if (!bgImage) {
      bgImageRef.current = null;
      setBgImageLoaded(false);
      return;
    }
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
      setBgImageLoaded(true);
    };
    img.onerror = () => {
      bgImageRef.current = null;
      setBgImageLoaded(false);
    };
    img.src = bgImage;
    return () => {
      img.src = "";
      bgImageRef.current = null;
      setBgImageLoaded(false);
    };
  }, [bgImage]);

  // Camera logic: center player, clamp to room bounds
  // Room size is passed as width/height props
  const camera = {
    x: Math.max(
      0,
      Math.min(
        player.x + player.width / 2 - CANVAS_WIDTH / 2,
        width - CANVAS_WIDTH,
      ),
    ),
    y: Math.max(
      0,
      Math.min(
        player.y + player.height / 2 - CANVAS_HEIGHT / 2,
        height - CANVAS_HEIGHT,
      ),
    ),
  };

  const drawPixelRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    color: string,
  ) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x - camera.x), Math.floor(y - camera.y), w, h);
  };

  /** Draw a pixel-art sprite scaled to dest size (Undertale-style crisp pixels). */
  const drawSprite = (
    ctx: CanvasRenderingContext2D,
    sprite: PixelSprite,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
  ) => {
    const cw = destW / sprite.w;
    const ch = destH / sprite.h;
    const prevSmooth = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    for (let py = 0; py < sprite.h; py++) {
      for (let px = 0; px < sprite.w; px++) {
        const color = sprite.pixels[py * sprite.w + px];
        if (!color) continue;
        ctx.fillStyle = color;
        const x = destX + px * cw - camera.x;
        const y = destY + py * ch - camera.y;
        ctx.fillRect(
          Math.floor(x),
          Math.floor(y),
          Math.ceil(cw) + 1,
          Math.ceil(ch) + 1,
        );
      }
    }
    ctx.imageSmoothingEnabled = prevSmooth;
  };

  /** Draw a sprite tiled to fill the rect (e.g. wood planks). Each tile = sprite.w x sprite.h world units. */
  const drawSpriteTiled = (
    ctx: CanvasRenderingContext2D,
    sprite: PixelSprite,
    destX: number,
    destY: number,
    destW: number,
    destH: number,
  ) => {
    const nx = Math.ceil(destW / sprite.w) + 1;
    const ny = Math.ceil(destH / sprite.h) + 1;
    for (let ty = 0; ty < ny; ty++) {
      for (let tx = 0; tx < nx; tx++) {
        drawSprite(
          ctx,
          sprite,
          destX + tx * sprite.w,
          destY + ty * sprite.h,
          sprite.w,
          sprite.h,
        );
      }
    }
  };

  const drawDamian = (ctx: CanvasRenderingContext2D, p: Player) => {
    const { x, y, frame } = p;
    const bounce = Math.sin(frame / 5) * 2;
    // Draw item in hand
    if (equippedItem === "pistol") {
      drawPixelRect(ctx, x - 12, y + 30 + bounce, 12, 6, "#888");
      drawPixelRect(ctx, x - 2, y + 32 + bounce, 8, 2, "#222");
    } else {
      drawPixelRect(ctx, x - 12, y + 20 + bounce, 6, 18, "#2d3436");
      drawPixelRect(ctx, x - 18, y + 35 + bounce, 18, 10, "#636e72");
    }
    drawPixelRect(ctx, x, y + 15, 30, 35, "#c0392b");
    drawPixelRect(ctx, x + 2, y, 26, 20, "#ffeaa7");
    drawPixelRect(ctx, x, y - 5, 30, 8, "#d35400");
    drawPixelRect(ctx, x - 2, y, 5, 15, "#d35400");
    drawPixelRect(ctx, x - 3, y + 5, 6, 12, "#111");
    drawPixelRect(ctx, x + 27, y + 5, 6, 12, "#111");
    drawPixelRect(ctx, x, y - 6, 30, 3, "#111");
    drawPixelRect(ctx, x + 5, y + 8, 20, 5, "#f1c40f");
    drawPixelRect(ctx, x + 4, y + 50, 8, 10, "#2d3436");
    drawPixelRect(ctx, x + 18, y + 50, 8, 10, "#2d3436");
  };

  /** Draw a door/portal (Undertale-style: dark frame + black opening) so the user sees where to go. */
  const drawDoorOrPortal = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    const { x, y, width, height } = obj;
    const frame = 4;
    // Outer frame (door frame / wall hole edge)
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(Math.floor(x), Math.floor(y), width, height);
    ctx.strokeStyle = "#444";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    // Inner black "hole" / door opening
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(x + frame, y + frame, width - frame * 2, height - frame * 2);
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + frame, y + frame, width - frame * 2, height - frame * 2);
  };

  const drawDarius = (ctx: CanvasRenderingContext2D, obj: GameObject) => {
    const { x, y } = obj;
    // Body (Red T-Shirt)
    drawPixelRect(ctx, x, y + 15, 30, 35, "#e74c3c");
    // Face
    drawPixelRect(ctx, x + 2, y, 26, 20, "#ffeaa7");
    // Blonde Hair
    drawPixelRect(ctx, x, y - 2, 30, 10, "#f1c40f");
    // Blue Cap
    drawPixelRect(ctx, x - 2, y - 6, 34, 6, "#2980b9");
    drawPixelRect(ctx, x + 15, y - 6, 20, 3, "#2980b9");
    // Legs
    drawPixelRect(ctx, x + 4, y + 50, 8, 10, "#2d3436");
    drawPixelRect(ctx, x + 18, y + 50, 8, 10, "#2d3436");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // Full-room background image (walls, base art)
      const img = bgImageRef.current;
      if (img && bgImageLoaded) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, -camera.x, -camera.y, width, height);
      }

      // Subtle grid (skip when bg image is used for less clutter)
      if (!img || !bgImageLoaded) {
        ctx.strokeStyle = "rgba(255,255,255,0.03)";
        for (let i = 0; i < width; i += TILE_SIZE) {
          const screenX = i - camera.x;
          if (screenX < 0 || screenX > CANVAS_WIDTH) continue;
          ctx.beginPath();
          ctx.moveTo(screenX, 0);
          ctx.lineTo(screenX, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let i = 0; i < height; i += TILE_SIZE) {
          const screenY = i - camera.y;
          if (screenY < 0 || screenY > CANVAS_HEIGHT) continue;
          ctx.beginPath();
          ctx.moveTo(0, screenY);
          ctx.lineTo(CANVAS_WIDTH, screenY);
          ctx.stroke();
        }
      }

      // Draw floor objects first (background)
      objects
        .filter((obj) => obj.type === "floor")
        .forEach((obj) => {
          if (obj.sprite) {
            if (obj.spriteRepeat) {
              drawSpriteTiled(
                ctx,
                obj.sprite,
                obj.x,
                obj.y,
                obj.width,
                obj.height,
              );
            } else {
              drawSprite(ctx, obj.sprite, obj.x, obj.y, obj.width, obj.height);
            }
          } else {
            drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
          }
        });

      // Non-floor objects sorted by zIndex (lower = behind, e.g. bar back then tables then NPCs)
      // Also filter out hidden objects
      const nonFloor = objects
        .filter((obj) => obj.type !== "floor" && obj.type !== "spawn_marker" && !obj.hidden)
        .slice()
        .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

      nonFloor.forEach((obj) => {
        if (obj.id.includes("darius") && !obj.sprite) {
          drawDarius(ctx, { ...obj, x: obj.x, y: obj.y });
        } else if (obj.type === "save" && !obj.sprite) {
          drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
          ctx.fillStyle = "white";
          ctx.font = "24px Arial";
          ctx.fillText("★", obj.x - camera.x + 8, obj.y - camera.y + 28);
        } else if (obj.type === "pickup" && !obj.sprite) {
          drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
          ctx.fillStyle = "#fff";
          ctx.font = "10px Arial";
          ctx.fillText("P", obj.x - camera.x + 6, obj.y - camera.y + 12);
        } else if (obj.type === "gun" && !obj.sprite) {
          drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
          ctx.fillStyle = "#fff";
          ctx.font = "12px Arial";
          ctx.fillText(
            "🔫",
            obj.x - camera.x + obj.width / 2 - 6,
            obj.y - camera.y + obj.height / 2 + 4,
          );
        } else if (obj.type === "trigger" && obj.triggerScene) {
          drawDoorOrPortal(ctx, { ...obj, x: obj.x, y: obj.y });
        } else if (targetsShot.includes(obj.id)) {
          drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, "#444");
          ctx.fillStyle = "#fff";
          ctx.font = "12px Arial";
          ctx.fillText(
            "X",
            obj.x - camera.x + obj.width / 2 - 4,
            obj.y - camera.y + obj.height / 2 + 4,
          );
        } else if (obj.sprite) {
          drawSprite(ctx, obj.sprite, obj.x, obj.y, obj.width, obj.height);
        } else {
          drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
        }

        // Draw enemy health bars
        if (
          obj.health !== undefined &&
          obj.maxHealth !== undefined &&
          !obj.isDead
        ) {
          const healthPercent = obj.health / obj.maxHealth;
          const barWidth = obj.width;
          const barHeight = 4;
          const barX = obj.x - camera.x;
          const barY = obj.y - camera.y - 8;

          // Background
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillRect(barX, barY, barWidth, barHeight);

          // Health
          ctx.fillStyle =
            healthPercent > 0.5
              ? "#2ecc71"
              : healthPercent > 0.25
                ? "#f39c12"
                : "#e74c3c";
          ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);

          // Border
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
      });

      // Draw projectiles
      if (projectiles) {
        projectiles.forEach((proj) => {
          ctx.fillStyle = proj.fromPlayer ? "#f39c12" : "#e74c3c";
          ctx.beginPath();
          ctx.arc(proj.x - camera.x, proj.y - camera.y, 4, 0, Math.PI * 2);
          ctx.fill();

          // Draw trail
          ctx.strokeStyle = proj.fromPlayer
            ? "rgba(255, 200, 0, 0.8)" // Bright yellow/gold for player
            : "rgba(255, 50, 50, 0.9)"; // Bright red for enemy
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(proj.x - camera.x, proj.y - camera.y);
          ctx.lineTo(
            proj.x - proj.vx * 0.12 - camera.x,
            proj.y - proj.vy * 0.12 - camera.y,
          );
          ctx.stroke();
        });
      }

      // Draw visual effects
      if (effects) {
        effects.forEach((effect) => {
          const age = Date.now() - effect.createdAt;
          const alpha = 1 - age / effect.lifetime;

          if (effect.type === "muzzle_flash") {
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.fillRect(
              effect.x - camera.x - 10,
              effect.y - camera.y - 10,
              20,
              20,
            );
          } else if (effect.type === "impact") {
            ctx.strokeStyle = `rgba(255, 0, 0, ${alpha})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(
              effect.x - camera.x,
              effect.y - camera.y,
              8,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else if (effect.type === "blood_splatter") {
            const sx = effect.x - camera.x;
            const sy = effect.y - camera.y;
            const t = Math.max(0, Math.min(1, alpha));

            // Main blot
            ctx.fillStyle = `rgba(120, 0, 0, ${0.65 * t})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 10, 0, Math.PI * 2);
            ctx.fill();

            // Inner darker core
            ctx.fillStyle = `rgba(60, 0, 0, ${0.9 * t})`;
            ctx.beginPath();
            ctx.arc(sx + 2, sy + 1, 5, 0, Math.PI * 2);
            ctx.fill();

            // Random droplets
            ctx.fillStyle = `rgba(150, 0, 0, ${0.55 * t})`;
            for (let i = 0; i < 5; i++) {
              const ox = (Math.random() - 0.5) * 26;
              const oy = (Math.random() - 0.5) * 26;
              const r = 2 + Math.random() * 3;
              ctx.beginPath();
              ctx.arc(sx + ox, sy + oy, r, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      }

      // Shot lines (dashed: spaces between)
      if (shotLines) {
        shotLines.forEach(line => {
          ctx.strokeStyle = "#fff";
          ctx.lineWidth = 2;
          ctx.setLineDash([8, 8]);
          ctx.beginPath();
          ctx.moveTo(line.from.x - camera.x, line.from.y - camera.y);
          ctx.lineTo(line.to.x - camera.x, line.to.y - camera.y);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }
// Draw Player
      if (scene !== GameScene.START && scene !== GameScene.ENDING) {
        drawDamian(ctx, player);
      }

      // Hit Flash Overlay
      if (hitFlash) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }



      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [
    player,
    objects,
    bgColor,
    bgImage,
    bgImageLoaded,
    width,
    height,
    scene,
    targetsShot,
    projectiles,
    effects,
    shotLines,
  ]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !onCanvasClick) return;
    const rect = canvas.getBoundingClientRect();
    // Use the actual canvas width/height for scaling, not global constants
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    onCanvasClick(x, y);
  };

  // Use the narrower dimension if room is smaller than default
  const canvasWidth = width < CANVAS_WIDTH ? width : CANVAS_WIDTH;
  const canvasHeight = height < CANVAS_HEIGHT ? height : CANVAS_HEIGHT;

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      className="border-4 border-white shadow-2xl bg-zinc-900"
      onClick={handleClick}
      style={equippedItem === "pistol" ? { cursor: "crosshair" } : undefined}
    />
  );
};

export default GameCanvas;
