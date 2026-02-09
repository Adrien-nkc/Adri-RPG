import React, { useRef, useEffect } from "react";
import { Player, GameObject, GameScene } from "../types";
import { CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE } from "../constants";

export interface ShotLine {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

interface GameCanvasProps {
  player: Player;
  objects: GameObject[];
  scene: GameScene;
  bgColor: string;
  width: number;
  height: number;
  equippedItem?: string;
  onCanvasClick?: (canvasX: number, canvasY: number) => void;
  shotLine?: ShotLine | null;
  targetsShot?: string[];
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  player,
  objects,
  scene,
  bgColor,
  width,
  height,
  equippedItem,
  onCanvasClick,
  shotLine,
  targetsShot = [],
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

      // Draw Grid / Floor
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

      // Draw floor objects first (background), then all other objects on top
      objects
        .filter((obj) => obj.type === "floor")
        .forEach((obj) => {
          drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
        });
      objects
        .filter((obj) => obj.type !== "floor")
        .forEach((obj) => {
          if (obj.id.includes("darius")) {
            drawDarius(ctx, { ...obj, x: obj.x, y: obj.y });
          } else if (obj.type === "save") {
            drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
            ctx.fillStyle = "white";
            ctx.font = "24px Arial";
            ctx.fillText("★", obj.x - camera.x + 8, obj.y - camera.y + 28);
          } else if (obj.type === "pickup") {
            drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
            ctx.fillStyle = "#fff";
            ctx.font = "10px Arial";
            ctx.fillText("P", obj.x - camera.x + 6, obj.y - camera.y + 12);
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
          } else {
            drawPixelRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.color);
          }
        });

      // Shot line (dashed: spaces between)
      if (shotLine) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.moveTo(shotLine.from.x - camera.x, shotLine.from.y - camera.y);
        ctx.lineTo(shotLine.to.x - camera.x, shotLine.to.y - camera.y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw Player
      if (scene !== GameScene.START && scene !== GameScene.ENDING) {
        drawDamian(ctx, player);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [player, objects, bgColor, scene, shotLine, targetsShot]);

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
