import { audioService } from "../services/audioService";
import type { Player, GameObject, ShotLine } from "../types";

export interface PistolActionResult {
  shotLine: ShotLine;
  soundPlayed: boolean;
  targetHitId?: string;
}

export function usePistol(
  player: Player,
  canvasX: number,
  canvasY: number,
  objects: GameObject[],
  targetsShot: string[],
  targetIds: string[],
): PistolActionResult {
  let targetHitId: string | undefined;
  for (const t of objects) {
    if (!targetIds.includes(t.id)) continue;
    if (targetsShot.includes(t.id)) continue;
    const inX = canvasX >= t.x && canvasX <= t.x + t.width;
    const inY = canvasY >= t.y && canvasY <= t.y + t.height;
    if (inX && inY) {
      targetHitId = t.id;
      break;
    }
  }
  const shotLine = {
    from: { x: player.x + player.width / 2, y: player.y + player.height / 2 },
    to: { x: canvasX, y: canvasY },
    createdAt: Date.now(),
  };
  audioService.playGunfireSound();
  return { shotLine, soundPlayed: true, targetHitId };
}
