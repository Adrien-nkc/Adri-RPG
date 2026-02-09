import { useState, useCallback } from "react";
import {
  AmmoState,
  GameObject,
  Projectile,
  VisualEffect,
  Vector2,
} from "../types";
import { ALL_GUNS, STARTING_AMMO } from "../items/guns";

interface GunSystemState {
  // Current equipped gun
  equippedGun: string | null;

  // Ammo tracking per gun
  ammo: Record<string, AmmoState>;

  // Owned guns
  ownedGuns: string[];

  // Projectiles
  projectiles: Projectile[];

  // Visual effects
  effects: VisualEffect[];

  // Last shot time (for fire rate)
  lastShotTime: number;
}

export function useGunSystem() {
  const [state, setState] = useState<GunSystemState>({
    equippedGun: null,
    ammo: {},
    ownedGuns: [],
    projectiles: [],
    effects: [],
    lastShotTime: 0,
  });

  // Add a gun to inventory
  const addGun = useCallback((gunId: string) => {
    if (!ALL_GUNS[gunId]) return;

    setState((prev) => {
      if (prev.ownedGuns.includes(gunId)) return prev;

      const startAmmo = STARTING_AMMO[gunId];
      return {
        ...prev,
        ownedGuns: [...prev.ownedGuns, gunId],
        ammo: {
          ...prev.ammo,
          [gunId]: {
            current: startAmmo.mag,
            reserve: startAmmo.reserve,
            isReloading: false,
          },
        },
        equippedGun: prev.equippedGun || gunId, // Auto-equip if first gun
      };
    });
  }, []);

  // Switch weapon
  const equipGun = useCallback((gunId: string | null) => {
    setState((prev) => {
      if (gunId && !prev.ownedGuns.includes(gunId)) return prev;
      return { ...prev, equippedGun: gunId };
    });
  }, []);

  // Reload
  const reload = useCallback(() => {
    setState((prev) => {
      if (!prev.equippedGun) return prev;

      const gunAmmo = prev.ammo[prev.equippedGun];
      if (!gunAmmo || gunAmmo.isReloading || gunAmmo.reserve === 0) return prev;

      const gun = ALL_GUNS[prev.equippedGun];
      if (gunAmmo.current === gun.magazineSize) return prev; // Already full

      // Start reload
      const newAmmo = { ...prev.ammo };
      newAmmo[prev.equippedGun] = {
        ...gunAmmo,
        isReloading: true,
      };

      // Play reload sound
      import("../services/audioService").then(({ audioService }) => {
        audioService.playReloadSound && audioService.playReloadSound();
      });

      // Complete reload after delay
      setTimeout(() => {
        setState((s) => {
          const currentGunAmmo = s.ammo[prev.equippedGun!];
          if (!currentGunAmmo) return s;

          const ammoNeeded = gun.magazineSize - currentGunAmmo.current;
          const ammoToReload = Math.min(ammoNeeded, currentGunAmmo.reserve);

          const updatedAmmo = { ...s.ammo };
          updatedAmmo[prev.equippedGun!] = {
            current: currentGunAmmo.current + ammoToReload,
            reserve: currentGunAmmo.reserve - ammoToReload,
            isReloading: false,
          };

          return { ...s, ammo: updatedAmmo };
        });
      }, gun.reloadTime);

      return { ...prev, ammo: newAmmo };
    });
  }, []);

  // Check if can shoot
  const canShoot = useCallback(() => {
    if (!state.equippedGun) return false;

    const gun = ALL_GUNS[state.equippedGun];
    const gunAmmo = state.ammo[state.equippedGun];

    if (!gun || !gunAmmo) return false;
    if (gunAmmo.isReloading) return false;
    if (gunAmmo.current === 0) return false;

    // Check fire rate
    const now = Date.now();
    const timeSinceLastShot = now - state.lastShotTime;
    const fireDelay = 1000 / gun.fireRate;

    return timeSinceLastShot >= fireDelay;
  }, [state]);

  // Shoot
  const shoot = useCallback(
    (
      fromX: number,
      fromY: number,
      targetX: number,
      targetY: number,
      objects: GameObject[],
    ): {
      hit: boolean;
      hitObjectId?: string;
      shotLine: { from: Vector2; to: Vector2 } | null;
    } => {
      if (!canShoot()) return { hit: false, shotLine: null };
      if (!state.equippedGun) return { hit: false, shotLine: null };

      const gun = ALL_GUNS[state.equippedGun];

      // Play pistol sound effect
      if (gun.id === "pistol") {
        // You can change the file path to your actual pistol sound
        import("../services/audioService").then(({ audioService }) => {
          audioService.playSfx &&
            audioService.playSfx("/SoundEffects/pistol.mp3");
        });
      }

      // Consume ammo
      setState((prev) => {
        const newAmmo = { ...prev.ammo };
        const gunAmmo = newAmmo[prev.equippedGun!];

        newAmmo[prev.equippedGun!] = {
          ...gunAmmo,
          current: gunAmmo.current - 1,
        };

        return {
          ...prev,
          ammo: newAmmo,
          lastShotTime: Date.now(),
        };
      });

      // Add muzzle flash effect
      addEffect("muzzle_flash", fromX, fromY, 100);

      // Calculate shot direction with spread
      const dx = targetX - fromX;
      const dy = targetY - fromY;
      const angle = Math.atan2(dy, dx);
      const spreadRad = ((gun.spread * Math.PI) / 180) * (Math.random() - 0.5);
      const finalAngle = angle + spreadRad;

      if (gun.projectileType === "hitscan") {
        // Instant raycast
        const shotLine = {
          from: { x: fromX, y: fromY },
          to: {
            x: fromX + Math.cos(finalAngle) * gun.range,
            y: fromY + Math.sin(finalAngle) * gun.range,
          },
          createdAt: Date.now(),
        };

        // Check hits
        const hit = checkHitscanHit(shotLine.from, shotLine.to, objects);

        if (hit.hit) {
          addEffect("impact", hit.x!, hit.y!, 200);
        }

        return { ...hit, shotLine };
      } else {
        // Spawn projectile
        const projectileId = `proj_${Date.now()}_${Math.random()}`;
        setState((prev) => ({
          ...prev,
          projectiles: [
            ...prev.projectiles,
            {
              id: projectileId,
              x: fromX,
              y: fromY,
              vx: Math.cos(finalAngle) * gun.bulletSpeed,
              vy: Math.sin(finalAngle) * gun.bulletSpeed,
              damage: gun.damage,
              range: gun.range,
              distanceTraveled: 0,
              fromPlayer: true,
              gunId: gun.id, // Add gun ID to identify rockets
            },
          ],
        }));

        return { hit: false, shotLine: null };
      }
    },
    [canShoot, state.equippedGun],
  );

  // Add visual effect
  const addEffect = useCallback(
    (type: VisualEffect["type"], x: number, y: number, lifetime: number) => {
      const effect: VisualEffect = {
        id: `effect_${Date.now()}_${Math.random()}`,
        type,
        x,
        y,
        lifetime,
        createdAt: Date.now(),
      };

      setState((prev) => ({
        ...prev,
        effects: [...prev.effects, effect],
      }));

      // Only set a timeout to remove the effect if it's NOT blood_splatter
      if (type !== "blood_splatter") {
        setTimeout(() => {
          setState((prev) => ({
            ...prev,
            effects: prev.effects.filter((e) => e.id !== effect.id),
          }));
        }, lifetime);
      }
    },
    [],
  );

  const spawnBloodSplatter = useCallback(
    (x: number, y: number, amount: number = 8, spread: number = 22) => {
      for (let i = 0; i < amount; i++) {
        const ox = (Math.random() - 0.5) * spread * 2;
        const oy = (Math.random() - 0.5) * spread * 2;
        // Set a very long lifetime for blood splatter to make it effectively permanent
        const lifetime = 1000 * 60 * 60 * 24 * 365 * 10; // 10 years
        addEffect("blood_splatter", x + ox, y + oy, lifetime);
      }
    },
    [addEffect],
  );

  // Update projectiles (call this in game loop)
  const updateProjectiles = useCallback(
    (deltaTime: number, objects: GameObject[]) => {
      setState((prev) => {
        const updatedProjectiles: Projectile[] = [];

        for (const proj of prev.projectiles) {
          // Move projectile
          const newX = proj.x + proj.vx * (deltaTime / 1000);
          const newY = proj.y + proj.vy * (deltaTime / 1000);
          const distance = Math.sqrt(
            Math.pow(newX - proj.x, 2) + Math.pow(newY - proj.y, 2),
          );
          const newDistanceTraveled = proj.distanceTraveled + distance;

          // Check if exceeded range
          if (newDistanceTraveled > proj.range) {
            continue; // Remove
          }

          // Check collision with objects
          let hitSomething = false;
          for (const obj of objects) {
            if (obj.isDead) continue;

            if (
              newX >= obj.x &&
              newX <= obj.x + obj.width &&
              newY >= obj.y &&
              newY <= obj.y + obj.height
            ) {
              // Hit!
              if (obj.health !== undefined) {
                // Regular projectile damage
                addEffect("impact", newX, newY, 200);
              }
              hitSomething = true;
              break;
            }
          }

          if (hitSomething) continue; // Remove

          // Keep projectile
          updatedProjectiles.push({
            ...proj,
            x: newX,
            y: newY,
            distanceTraveled: newDistanceTraveled,
          });
        }

        return { ...prev, projectiles: updatedProjectiles };
      });
    },
    [],
  );

  return {
    equippedGun: state.equippedGun,
    ammo: state.ammo,
    ownedGuns: state.ownedGuns,
    projectiles: state.projectiles,
    effects: state.effects,
    addGun,
    equipGun,
    reload,
    canShoot,
    shoot,
    spawnBloodSplatter,
    updateProjectiles,
  };
}

// Helper: Check hitscan hit
function checkHitscanHit(
  from: { x: number; y: number },
  to: { x: number; y: number },
  objects: GameObject[],
): { hit: boolean; hitObjectId?: string; x?: number; y?: number } {
  // Simple raycast - check line intersection with object rectangles
  for (const obj of objects) {
    if (obj.isDead) continue;
    if (!obj.isEnemy && !obj.health) continue; // Only hit enemies or destructible objects

    const hit = lineRectIntersection(from, to, obj);
    if (hit) {
      return {
        hit: true,
        hitObjectId: obj.id,
        x: hit.x,
        y: hit.y,
      };
    }
  }

  return { hit: false };
}

// Helper: Line-rectangle intersection
function lineRectIntersection(
  from: { x: number; y: number },
  to: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
): { x: number; y: number } | null {
  // Check if line intersects with any of the 4 sides of the rectangle
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;

  // Simple bounding box check first
  if (from.x >= left && from.x <= right && from.y >= top && from.y <= bottom) {
    return { x: from.x, y: from.y };
  }

  // Check all 4 edges
  const edges = [
    { x1: left, y1: top, x2: right, y2: top }, // Top
    { x1: right, y1: top, x2: right, y2: bottom }, // Right
    { x1: left, y1: bottom, x2: right, y2: bottom }, // Bottom
    { x1: left, y1: top, x2: left, y2: bottom }, // Left
  ];

  for (const edge of edges) {
    const intersection = lineLineIntersection(
      from.x,
      from.y,
      to.x,
      to.y,
      edge.x1,
      edge.y1,
      edge.x2,
      edge.y2,
    );

    if (intersection) return intersection;
  }

  return null;
}

// Helper: Line-line intersection
function lineLineIntersection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number,
): { x: number; y: number } | null {
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}
