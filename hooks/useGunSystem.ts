import { useState, useCallback, useMemo, useRef } from "react";
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

  // Visual shot lines (traces)
  shotLines: { id: string; from: Vector2; to: Vector2; createdAt: number }[];

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
    shotLines: [],
    lastShotTime: 0,
  });

  // Ref for projectiles to handle physics/collision outside of React state purity constraints
  const projectilesRef = useRef<Projectile[]>([]);

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
        // Only auto-equip if we have NO gun equipped at all. 
        // If we already have a gun, don't force switch.
        equippedGun: prev.equippedGun || gunId,
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

  // Add a shot line trace
  const addShotLine = useCallback((from: Vector2, to: Vector2, lifetime: number = 100) => {
    const id = `shot_${Date.now()}_${Math.random()}`;
    setState(prev => ({
      ...prev,
      shotLines: [...prev.shotLines, { id, from, to, createdAt: Date.now() }]
    }));

    setTimeout(() => {
      setState(prev => ({
        ...prev,
        shotLines: prev.shotLines.filter(s => s.id !== id)
      }));
    }, lifetime);
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
      shotLine?: { from: Vector2; to: Vector2 };
    } => {
      if (!canShoot()) return { hit: false };
      if (!state.equippedGun) return { hit: false };

      const gun = ALL_GUNS[state.equippedGun];
      
      // Update ammo
      setState((prev) => {
        const ammo = prev.ammo[prev.equippedGun!];
        return {
          ...prev,
          lastShotTime: Date.now(),
          ammo: {
            ...prev.ammo,
            [prev.equippedGun!]: {
              ...ammo,
              current: ammo.current - 1,
            },
          },
        };
      });

      // Play sound
      import("../services/audioService").then(({ audioService }) => {
        if (gun.id === "pistol") {
             audioService.playSfx("/SoundEffects/pistol.mp3");
        } else {
             audioService.playGunfireSound && audioService.playGunfireSound();
        }
      });

      // Muzzle flash
      addEffect("muzzle_flash", fromX, fromY, 50);

      // Calculate spread
      const angle = Math.atan2(targetY - fromY, targetX - fromX);
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
        };

        // Check hits
        const hit = checkHitscanHit(shotLine.from, shotLine.to, objects);

        if (hit.hit) {
          addEffect("impact", hit.x!, hit.y!, 200);
          // If we hit something, shorten the shot line to the hit point
          shotLine.to = { x: hit.x!, y: hit.y! };
        }

        addShotLine(shotLine.from, shotLine.to, 100);

        return { hit: hit.hit, hitObjectId: hit.hitObjectId, shotLine };
      } else {
         // Projectile logic
         const proj: Projectile = {
            id: `proj_${Date.now()}_${Math.random()}`,
            x: fromX,
            y: fromY,
            vx: Math.cos(finalAngle) * gun.bulletSpeed,
            vy: Math.sin(finalAngle) * gun.bulletSpeed,
            damage: gun.damage,
            range: gun.range,
            distanceTraveled: 0,
            fromPlayer: true,
            alignment: "player",
            gunId: gun.id,
         };
         
         projectilesRef.current.push(proj);
         // Sync state for rendering
         setState(prev => ({ ...prev, projectiles: projectilesRef.current }));
         
         return { hit: false };
      }
    },
    [canShoot, state.equippedGun, addEffect, addShotLine]
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
    (
      deltaTime: number,
      objects: GameObject[],
      player?: { x: number; y: number; width: number; height: number; health?: number; maxHealth?: number },
      onPlayerHit?: (damage: number) => void,
      onEnemyHit?: (objId: string, damage: number) => void
    ) => {
        // Use Ref for calculation to avoid React state purity issues (double execution)
        const currentProjectiles = projectilesRef.current;
        const updatedProjectiles: Projectile[] = [];
        
        for (const proj of currentProjectiles) {
          // Move projectile
          proj.x += proj.vx * (deltaTime / 1000);
          proj.y += proj.vy * (deltaTime / 1000);
          proj.distanceTraveled +=
            Math.hypot(proj.vx, proj.vy) * (deltaTime / 1000);

          let hitSomething = false;

          // Collision with environment or other targets based on alignment
          if (proj.alignment === "enemy") {
            // Enemy projectiles hit player or friendly NPCs
            if (player && (player.health ?? 1) > 0) {
              const dx = proj.x - (player.x + player.width / 2);
              const dy = proj.y - (player.y + player.height / 2);
              const dist = Math.hypot(dx, dy);
              if (dist < 25) {
                if (onPlayerHit) onPlayerHit(proj.damage);
                hitSomething = true;
              }
            }
            
            // NPCs with 'player' alignment
            for (const obj of objects) {
              if (obj.alignment === "player" && obj.type === "npc" && !obj.isDead) {
                const dx = proj.x - (obj.x + obj.width / 2);
                const dy = proj.y - (obj.y + obj.height / 2);
                const dist = Math.hypot(dx, dy);
                if (dist < 25) {
                  hitSomething = true;
                  if (onEnemyHit) onEnemyHit(obj.id, proj.damage);
                }
              }
            }
          } else {
            // Player/NPC projectiles hit enemies
            for (const obj of objects) {
              if (obj.alignment === "enemy" && !obj.isDead) {
                const dx = proj.x - (obj.x + obj.width / 2);
                const dy = proj.y - (obj.y + obj.height / 2);
                const dist = Math.hypot(dx, dy);
                if (dist < 25) {
                  hitSomething = true;
                  if (onEnemyHit) onEnemyHit(obj.id, proj.damage);
                }
              }
            }
          }

          // Wall collision
          if (!hitSomething) {
            for (const obj of objects) {
              if (obj.type !== "floor" && obj.collidable && !obj.hidden && obj.alignment === undefined) {
                 if (proj.x >= obj.x && proj.x <= obj.x + obj.width && 
                     proj.y >= obj.y && proj.y <= obj.y + obj.height) {
                     hitSomething = true;
                 }
              }
            }
          }

          if (!hitSomething && proj.distanceTraveled < proj.range) {
            updatedProjectiles.push(proj);
          } else {
            addEffect("impact", proj.x, proj.y, 200);
          }
        }

        // Update Ref
        projectilesRef.current = updatedProjectiles;
        
        // Update State for rendering
        setState((prev) => ({
          ...prev,
          projectiles: updatedProjectiles,
        }));
    },
    [addEffect],
  );

  const addEnemyProjectile = useCallback((x: number, y: number, targetX: number, targetY: number, damage: number, alignment: "player" | "enemy" = "enemy") => {
      const speed = 2500;
      const angle = Math.atan2(targetY - y, targetX - x);
      const proj: Projectile = {
        id: `eproj_${Date.now()}_${Math.random()}`,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        damage,
        range: 1000,
        distanceTraveled: 0,
        fromPlayer: alignment === "player",
        alignment,
      };
      
      projectilesRef.current.push(proj);
      setState((prev) => ({
        ...prev,
        projectiles: projectilesRef.current,
      }));
  }, []);

  return useMemo(() => ({
    equippedGun: state.equippedGun,
    ammo: state.ammo,
    ownedGuns: state.ownedGuns,
    projectiles: state.projectiles,
    effects: state.effects,
    shotLines: state.shotLines, // Added to return
    addGun,
    equipGun,
    reload,
    canShoot,
    shoot,
    spawnBloodSplatter,
    updateProjectiles,
    addEnemyProjectile,
    addShotLine, // Added to return
  }), [state, addGun, equipGun, reload, canShoot, shoot, spawnBloodSplatter, updateProjectiles, addEnemyProjectile, addShotLine]);
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
