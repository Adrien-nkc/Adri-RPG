import React, { useState, useEffect, useCallback, useRef } from "react";
import GameCanvas from "./components/GameCanvas";
import type { ShotLine } from "./types";
import DialogueBox from "./components/DialogueBox";
import AdminPanel from "./components/AdminPanel";
import {
  GameScene,
  Player,
  DialogueState,
  InventoryItem,
  GameObject,
} from "./types";
import { SCENE_CONFIGS } from "./rooms";

import { DEFAULT_INVENTORY, getItem } from "./items";
// import { usePistol } from "./items/pistol";
import { audioService } from "./services/audioService";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import { useGunSystem } from "./hooks/useGunSystem";
import HUD from "./components/HUD";
import { ALL_GUNS } from "./items/guns";

function isAdminMode() {
  const params = new URLSearchParams(window.location.search);
  const isAdminQuery = params.get("admin") === "1";
  const isAdminPath = window.location.pathname === "/admin";
  return isAdminQuery || isAdminPath;
}

const App: React.FC = () => {
  const [showAdmin, setShowAdmin] = useState(isAdminMode);
  useEffect(() => {
    const check = () => setShowAdmin(isAdminMode());
    window.addEventListener("popstate", check);
    const interval = setInterval(check, 200);
    return () => {
      window.removeEventListener("popstate", check);
      clearInterval(interval);
    };
  }, []);
  if (showAdmin) return <AdminPanel />;
  return <GameView />;
};

const GameView: React.FC = () => {
  // Info panel visibility state
  const [infoPanelVisible, setInfoPanelVisible] = useState(true);

  // Listen for 'i' key to toggle info panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "i") {
        setInfoPanelVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  const [hasStarted, setHasStarted] = useState(false);
  const [scene, setScene] = useState<GameScene>(GameScene.START);
  const [player, setPlayer] = useState<Player>(() => {
    // Use tutorial spawn if starting in tutorial, else start room
    const initialScene = GameScene.TUTORIAL;
    const startConfig = SCENE_CONFIGS[initialScene];
    return {
      x: startConfig.spawnPoint?.x ?? 0,
      y: startConfig.spawnPoint?.y ?? 0,
      width: 30,
      height: 50,
      speed: 4,
      frame: 0,
      facing: "down",
    };
  });

  const [dialogue, setDialogue] = useState<DialogueState>({
    speaker: "",
    text: [],
    currentIndex: 0,
    active: false,
  });

  const [inventory, setInventory] =
    useState<InventoryItem[]>(DEFAULT_INVENTORY);
  const [equippedIndex, setEquippedIndex] = useState(0);
  const [introShown, setIntroShown] = useState(false);
  const [tutorialPistolPickedUp, setTutorialPistolPickedUp] = useState(false);
  const [tutorialTargetsShot] = useState<string[]>([]); // used for tutorial filtering
  const [tutorialPhoneShown, setTutorialPhoneShown] = useState(false);
  const [onEnterDialogueShownFor, setOnEnterDialogueShownFor] = useState<
    Set<GameScene>
  >(new Set());
  const [shotLine, setShotLine] = useState<ShotLine | null>(null);
  // Gun system integration
  const gunSystem = useGunSystem();
  // Player health state
  const [playerHealth] = useState(100);
  // Scene config state for gun/enemy health updates
  const baseConfig = SCENE_CONFIGS[scene];
  const [sceneConfig, setSceneConfig] = useState(() => baseConfig);

  // Only reset sceneConfig from static config on scene change
  useEffect(() => {
    if (scene !== GameScene.TUTORIAL) {
      setSceneConfig(SCENE_CONFIGS[scene]);
    } else {
      // On scene change, reset to static config
      setSceneConfig(SCENE_CONFIGS[GameScene.TUTORIAL]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene]);

  // For tutorial, filter out pickups from current objects array, preserving AI/enemy positions
  useEffect(() => {
    if (scene === GameScene.TUTORIAL) {
      setSceneConfig((prev) => {
        let objects = prev.objects;
        if (tutorialPistolPickedUp) {
          objects = objects.filter((obj) => obj.id !== "pistol_pickup");
        }
        // Door visibility is now handled by the 'hidden' property + death triggers
        return { ...prev, objects };
      });
    }
  }, [scene, tutorialPistolPickedUp]);
  const [transitionPhase, setTransitionPhase] = useState<"none" | "out" | "in">(
    "none",
  );
  const [transitionTarget, setTransitionTarget] = useState<GameScene | null>(
    null,
  );
  const [transitionOpacity, setTransitionOpacity] = useState(0);
  const lastBgmRef = useRef<string | null>(null);
  // Track previous scene for proper spawn reset
  const prevSceneRef = useRef(scene);

  const INTRO_LINES = [
    "In a world where progress is a ritual of ownership...",
    "Two shadows align against the light of a Dying Sun.",
    "Damian. Darius.",
    "Sociopathy is their only defense against a heartless monopoly.",
    "Proceed with the mission.",
  ];

  const keys = useRef<Record<string, boolean>>({});
  const distanceMovedRef = useRef(0);

  useEffect(() => {
    if (!hasStarted) return;
    // Only reset when scene actually changed
    const sceneChanged = prevSceneRef.current !== scene;
    if (sceneChanged) {
      // Clear shot lines on scene change
      setShotLine(null);
      prevSceneRef.current = scene;
    }
  }, [scene, hasStarted, tutorialPistolPickedUp, tutorialTargetsShot]);

  const PHONE_LINES = [
    "You have 1 new message.",
    "Damian: I'm gonna train you before I meet you. Grab the pistol on the floor—I bought it for you. Use the mouse to shoot the three targets.",
  ];
  useEffect(() => {
    if (
      scene !== GameScene.TUTORIAL ||
      !hasStarted ||
      dialogue.active ||
      tutorialPhoneShown
    )
      return;
    setTutorialPhoneShown(true);
    audioService.playSfx("/OST/NotificationPhone.ogg");
    triggerDialogue("📱", PHONE_LINES);
  }, [scene, hasStarted, dialogue.active, tutorialPhoneShown]);

  // Transition animation: fade out -> change scene + BGM -> fade in
  const TRANSITION_DURATION = 400;
  useEffect(() => {
    if (transitionPhase === "out" && transitionTarget) {
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / TRANSITION_DURATION, 1);
        setTransitionOpacity(t);
        if (t >= 1) {
          const nextConfig = SCENE_CONFIGS[transitionTarget];
          const currentBgm = lastBgmRef.current;
          const setSceneAndPlayer = () => {
            setScene(transitionTarget);
            // Set player spawn immediately after scene change
            setTimeout(() => {
              // Find specific spawn point from previous scene, or use default
              let spawnX = nextConfig.spawnPoint.x;
              let spawnY = nextConfig.spawnPoint.y;

              // Look for spawn marker that matches the scene we generate coming FROM
              // We are transitioning to 'transitionTarget', coming from 'scene'
              const spawnMarker = nextConfig.objects.find(
                (o) => o.type === "spawn_marker" && o.fromScene === scene
              );

              if (spawnMarker) {
                spawnX = spawnMarker.x;
                spawnY = spawnMarker.y;
              }

              setPlayer((p) => ({
                ...p,
                x: spawnX,
                y: spawnY,
              }));
            }, 0);
            setTransitionPhase("in");
            setTransitionTarget(null);
          };
          if (nextConfig.bgMusic !== currentBgm) {
            audioService.fadeOutBgmThenPlay(nextConfig.bgMusic).then(() => {
              lastBgmRef.current = nextConfig.bgMusic;
              setSceneAndPlayer();
            });
          } else {
            lastBgmRef.current = nextConfig.bgMusic;
            setSceneAndPlayer();
          }
        } else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }, [transitionPhase, transitionTarget]);

  const transitionInPhaseRef = useRef(false);
  useEffect(() => {
    if (transitionPhase === "in" && !transitionInPhaseRef.current) {
      transitionInPhaseRef.current = true;
      setTransitionOpacity(1);
      const start = performance.now();
      const tick = () => {
        const elapsed = performance.now() - start;
        const t = Math.min(elapsed / TRANSITION_DURATION, 1);
        setTransitionOpacity(1 - t);
        if (t < 1) requestAnimationFrame(tick);
        else {
          setTransitionPhase("none");
          transitionInPhaseRef.current = false;
        }
      };
      requestAnimationFrame(tick);
    }
  }, [transitionPhase]);

  // Auto dialogue when entering a room (from the room's onEnterDialogue, once per room)
  useEffect(() => {
    if (!hasStarted || dialogue.active || onEnterDialogueShownFor.has(scene))
      return;
    const config = SCENE_CONFIGS[scene];
    const entry = config.onEnterDialogue;
    if (!entry) return;
    setOnEnterDialogueShownFor((prev) => new Set(prev).add(scene));
    triggerDialogue(entry.speaker, entry.lines);
  }, [scene, hasStarted, dialogue.active, onEnterDialogueShownFor]);

  // Intro dialogue when landing on Brazil safehouse (first time, after leaving house)
  useEffect(() => {
    if (
      scene !== GameScene.BRAZIL_SAFEHOUSE ||
      !hasStarted ||
      dialogue.active ||
      introShown
    )
      return;
    setIntroShown(true);
    triggerDialogue("System", INTRO_LINES);
  }, [scene, hasStarted, dialogue.active, introShown]);

  useEffect(() => {
    setPlayer((prev) => ({ ...prev, health: playerHealth }));
  }, [playerHealth]);

  const triggerDialogue = useCallback((speaker: string, text: string[]) => {
    setDialogue({ speaker, text, currentIndex: 0, active: true });
  }, []);

  const pickupItem = (itemId: string) => {
    // Map room object IDs to item IDs
    let actualItemId = itemId;
    if (itemId === "pistol_pickup") actualItemId = "pistol";
    if (itemId === "shotgun_pickup") actualItemId = "shotgun";
    if (itemId === "rifle_pickup") actualItemId = "rifle";
    if (itemId === "smg_pickup") actualItemId = "smg";

    const item = getItem(actualItemId);
    if (item) {
      setInventory((prev) => {
        if (prev.some((i) => i.id === actualItemId)) return prev;
        return [...prev, item];
      });
    }

    if (actualItemId === "pistol") {
      setTutorialPistolPickedUp(true);
      gunSystem.addGun("pistol");
      gunSystem.equipGun && gunSystem.equipGun("pistol"); // Auto-equip pistol after pickup
    } else if (actualItemId === "shotgun") {
      gunSystem.addGun("shotgun");
      gunSystem.equipGun && gunSystem.equipGun("shotgun");
    } else if (actualItemId === "rifle") {
      gunSystem.addGun("rifle");
      gunSystem.equipGun && gunSystem.equipGun("rifle");
    } else if (actualItemId === "smg") {
      gunSystem.addGun("smg");
      gunSystem.equipGun && gunSystem.equipGun("smg");
    }
  };

  const startTransition = useCallback((nextScene: GameScene) => {
    setTransitionTarget(nextScene);
    setTransitionPhase("out");
  }, []);

  const handleDialogueComplete = () => {
    if (dialogue.currentIndex < dialogue.text.length - 1) {
      setDialogue((prev) => ({ ...prev, currentIndex: prev.currentIndex + 1 }));
    } else {
      setDialogue((prev) => ({ ...prev, active: false }));
    }
  };

  const checkInteractions = useCallback(() => {
    if (dialogue.active || !hasStarted) return;

    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;
    const INTERACT_RANGE = 50; // max distance from player center to object rect (edge or inside)

    for (const obj of sceneConfig.objects) {
      if (obj.type === "floor") continue; // floor is walkable area, not interactable
      if (obj.hidden) continue; // hidden objects are inactive
      // Distance from player center to nearest point on object rect (so large/adjacent objects work)
      const nearestX = Math.max(obj.x, Math.min(obj.x + obj.width, pcx));
      const nearestY = Math.max(obj.y, Math.min(obj.y + obj.height, pcy));
      const distance = Math.hypot(pcx - nearestX, pcy - nearestY);

      if (distance < INTERACT_RANGE) {
        if (obj.type === "pickup") {
          pickupItem(obj.id);
          if (obj.dialogue) triggerDialogue(obj.name || "", obj.dialogue);
          return;
        }
        if (obj.type === "trigger" && obj.triggerScene) {
          startTransition(obj.triggerScene);
          return;
        }
        if (obj.type === "gun") {
          // Gun objects are interactable (E key) - show dialogue if available
          if (obj.dialogue) {
            triggerDialogue(obj.name || "", obj.dialogue);
            return;
          }
        }

        if (obj.dialogue) {
          triggerDialogue(obj.name || "", obj.dialogue);
          return;
        }
      }
    }
  }, [player, sceneConfig, dialogue.active, hasStarted, startTransition]);

  // Input Handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      keys.current[k] = true;
      if (k === "e") checkInteractions();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [checkInteractions, dialogue.active]);

  // Game Loop for Movement
  useEffect(() => {
    function clamp(val: number, min: number, max: number) {
      return Math.max(min, Math.min(max, val));
    }
    const move = () => {
      if (
        !hasStarted ||
        dialogue.active ||
        scene === GameScene.START ||
        scene === GameScene.ENDING
      )
        return;

      // --- PLAYER MOVEMENT ---
      setPlayer((prev) => {
        let dx = 0;
        let dy = 0;
        if (keys.current["w"] || keys.current["arrowup"]) dy -= prev.speed;
        if (keys.current["s"] || keys.current["arrowdown"]) dy += prev.speed;
        if (keys.current["a"] || keys.current["arrowleft"]) dx -= prev.speed;
        if (keys.current["d"] || keys.current["arrowright"]) dx += prev.speed;

        let newX = prev.x + dx;
        let newY = prev.y + dy;

        // Walking sound
        if (dx !== 0 || dy !== 0) {
          const dist = Math.hypot(dx, dy);
          distanceMovedRef.current += dist;
          if (distanceMovedRef.current >= 35) {
            audioService.playStepSound && audioService.playStepSound();
            distanceMovedRef.current = 0;
          }
        } else {
          distanceMovedRef.current = 0;
        }

        // Room boundary collision (dynamic per room)
        const roomWidth = sceneConfig.width ?? CANVAS_WIDTH;
        const roomHeight = sceneConfig.height ?? CANVAS_HEIGHT;

        newX = clamp(newX, 0, roomWidth - prev.width);
        newY = clamp(newY, 0, roomHeight - prev.height);

        // --- Floor-based collision (Undertale-style: walkable = inside a floor object; edges = walls) ---
        const floorObjects = sceneConfig.objects.filter(
          (o) => o.type === "floor",
        );
        if (floorObjects.length > 0) {
          const playerInFloor = (px: number, py: number) =>
            floorObjects.some(
              (f) =>
                px >= f.x &&
                py >= f.y &&
                px + prev.width <= f.x + f.width &&
                py + prev.height <= f.y + f.height,
            );
          if (!playerInFloor(newX, newY)) {
            newX = prev.x;
            newY = prev.y;
          }
        }

        // Collidable object collision detection (exclude floor - floor defines walkable area, never blocks)
        const collidableObjects = sceneConfig.objects.filter(
          (obj) => obj.type !== "floor" && obj.collidable && !obj.hidden,
        );
        for (const obj of collidableObjects) {
          const wouldCollide =
            newX < obj.x + obj.width &&
            newX + prev.width > obj.x &&
            newY < obj.y + obj.height &&
            newY + prev.height > obj.y;
          if (wouldCollide) {
            // Calculate collision from which side and prevent movement
            const overlapLeft = newX + prev.width - obj.x;
            const overlapRight = obj.x + obj.width - newX;
            const overlapTop = newY + prev.height - obj.y;
            const overlapBottom = obj.y + obj.height - newY;
            const minOverlap = Math.min(
              overlapLeft,
              overlapRight,
              overlapTop,
              overlapBottom,
            );
            if (minOverlap === overlapLeft) {
              newX = obj.x - prev.width;
            } else if (minOverlap === overlapRight) {
              newX = obj.x + obj.width;
            } else if (minOverlap === overlapTop) {
              newY = obj.y - prev.height;
            } else if (minOverlap === overlapBottom) {
              newY = obj.y + obj.height;
            }
          }
        }

        // Automatic doorway transition (walk through without pressing E)
        const doorways = sceneConfig.objects.filter(
          (obj) => obj.type === "doorway" && obj.triggerScene && !obj.hidden,
        );
        for (const doorway of doorways) {
          const isOverlapping =
            newX < doorway.x + doorway.width &&
            newX + prev.width > doorway.x &&
            newY < doorway.y + doorway.height &&
            newY + prev.height > doorway.y;
          if (isOverlapping && doorway.triggerScene) {
            startTransition(doorway.triggerScene);
            return {
              ...prev,
              x: newX,
              y: newY,
              frame: dx !== 0 || dy !== 0 ? prev.frame + 1 : prev.frame,
            };
          }
        }

        return {
          ...prev,
          x: newX,
          y: newY,
          frame: dx !== 0 || dy !== 0 ? prev.frame + 1 : prev.frame,
        };
      });

      // --- ENEMY AI UPDATE ---
      setSceneConfig((prev) => {
        const updatedObjects = prev.objects.map((obj) => {
          if (!obj.isEnemy || obj.isDead) return obj;
          let {
            x,
            y,
            aiType,
            patrolPoints,
            patrolIndex = 0,
            aiState = "idle",
            speed = 2,
            lastStateChange = 0,
          } = obj;
          const now = Date.now();
          const playerCenter = {
            x: player.x + player.width / 2,
            y: player.y + player.height / 2,
          };
          const enemyCenter = {
            x: x + (obj.width || 30) / 2,
            y: y + (obj.height || 50) / 2,
          };
          const distToPlayer = Math.hypot(
            playerCenter.x - enemyCenter.x,
            playerCenter.y - enemyCenter.y,
          );
          let newState = aiState;
          let newX = x;
          let newY = y;
          let newPatrolIndex = patrolIndex;
          let newLastStateChange = lastStateChange;

          // Simple state transitions
          if (aiType === "chase" || aiType === "follow") {
            if (distToPlayer < 300) {
              newState = "chase";
            } else {
              newState = "idle";
            }
          } else if (aiType === "patrol") {
            if (distToPlayer < 250) {
              newState = "chase";
            } else {
              newState = "patrol";
            }
          } else {
            newState = "idle";
          }

          // State behavior
          if (newState === "chase") {
            // Move toward player
            const dx = playerCenter.x - enemyCenter.x;
            const dy = playerCenter.y - enemyCenter.y;
            const len = Math.hypot(dx, dy) || 1;
            const moveX = (dx / len) * speed;
            const moveY = (dy / len) * speed;
            newX += moveX;
            newY += moveY;
          } else if (
            newState === "patrol" &&
            Array.isArray(patrolPoints) &&
            patrolPoints.length > 0
          ) {
            // Move toward next patrol point
            const target = patrolPoints[patrolIndex % patrolPoints.length];
            const dx = target.x - enemyCenter.x;
            const dy = target.y - enemyCenter.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 8) {
              newPatrolIndex = (patrolIndex + 1) % patrolPoints.length;
              newLastStateChange = now;
            } else {
              const moveX = (dx / (dist || 1)) * speed;
              const moveY = (dy / (dist || 1)) * speed;
              newX += moveX;
              newY += moveY;
            }
          }
          // Clamp to room
          const roomWidth = prev.width ?? CANVAS_WIDTH;
          const roomHeight = prev.height ?? CANVAS_HEIGHT;
          newX = clamp(newX, 0, roomWidth - (obj.width || 30));
          newY = clamp(newY, 0, roomHeight - (obj.height || 50));

          return {
            ...obj,
            x: newX,
            y: newY,
            aiState: newState,
            patrolIndex: newPatrolIndex,
            lastStateChange: newLastStateChange,
          };
        });
        return { ...prev, objects: updatedObjects };
      });
    };
    const interval = setInterval(move, 1000 / 60);
    return () => clearInterval(interval);
  }, [
    dialogue.active,
    scene,
    hasStarted,
    sceneConfig.objects,
    startTransition,
    player,
  ]);

  const handleStartGame = () => {
    audioService.resume();
    setHasStarted(true);
    setScene(GameScene.TUTORIAL);
  };

  // Handle shooting with gun system
  const handleCanvasClick = useCallback(
    (canvasX: number, canvasY: number) => {
      if (!gunSystem.equippedGun) return;

      // Room size is passed as width/height props
      const roomWidth = sceneConfig.width ?? CANVAS_WIDTH;
      const roomHeight = sceneConfig.height ?? CANVAS_HEIGHT;

      // Camera logic (matching GameCanvas.tsx)
      const cameraX = Math.max(
        0,
        Math.min(
          player.x + player.width / 2 - CANVAS_WIDTH / 2,
          roomWidth - CANVAS_WIDTH,
        ),
      );
      const cameraY = Math.max(
        0,
        Math.min(
          player.y + player.height / 2 - CANVAS_HEIGHT / 2,
          roomHeight - CANVAS_HEIGHT,
        ),
      );

      const worldX = canvasX + cameraX;
      const worldY = canvasY + cameraY;

      const result = gunSystem.shoot(
        player.x + player.width / 2,
        player.y + player.height / 2,
        worldX,
        worldY,
        sceneConfig.objects,
      );
      if (result.hit && result.hitObjectId) {
        const hitObj = sceneConfig.objects.find(
          (o) => o.id === result.hitObjectId,
        );
        if (hitObj) {
          const hx = hitObj.x + hitObj.width / 2;
          const hy = hitObj.y + hitObj.height / 2;
          // Blood on hit
          gunSystem.spawnBloodSplatter(hx, hy, 10, 26);
        }
        // Damage enemy
        setSceneConfig((prev: any) => {
          let triggeredObjectId: string | null = null;
          const updatedObjects = prev.objects.map((obj: any) => {
            if (obj.id === result.hitObjectId && obj.health !== undefined) {
              const gun = ALL_GUNS[gunSystem.equippedGun!];
              const newHealth = obj.health - gun.damage;
              const diedNow = newHealth <= 0 && !obj.isDead;
              if (diedNow) {
                // Extra gore burst on death
                const hx = obj.x + obj.width / 2;
                const hy = obj.y + obj.height / 2;
                gunSystem.spawnBloodSplatter(hx, hy, 10, 26);
                // Track triggered object on death
                if (obj.onDeathTrigger) {
                  triggeredObjectId = obj.onDeathTrigger;
                }
              }
              return {
                ...obj,
                health: Math.max(0, newHealth),
                isDead: newHealth <= 0,
                color: newHealth <= 0 ? "#3a0000" : obj.color,
              };
            }
            return obj;
          });
          // Activate/reveal triggered object if an enemy died
          if (triggeredObjectId) {
            return {
              ...prev,
              objects: updatedObjects.map((obj: any) => {
                if (obj.id === triggeredObjectId) {
                  // Reveal the object (remove hidden flag, ensure it's visible)
                  return { ...obj, hidden: false, isTriggered: true };
                }
                return obj;
              }),
            };
          }
          return { ...prev, objects: updatedObjects };
        });
      }
      // Show shot line briefly
      if (result.shotLine) {
        setShotLine({ ...result.shotLine, createdAt: Date.now() });
        setTimeout(() => setShotLine(null), 100);
      }
    },
    [gunSystem, player, sceneConfig.objects],
  );

  // Weapon switching (1-5 keys) and reload
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Inventory switching (1-9 keys)
      if (e.key >= "1" && e.key <= "9") {
        const index = parseInt(e.key) - 1;
        if (inventory[index]) {
          setEquippedIndex(index);
          const item = inventory[index];
          // If the item is a gun, equip it in the gun system too
          if (ALL_GUNS[item.id]) {
            gunSystem.equipGun(item.id);
          } else {
            // If it's not a gun (like hammer), unequip current gun
            gunSystem.equipGun(null);
          }
        }
      }
      // Reload
      if (e.key === "r" || e.key === "R") {
        gunSystem.reload();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inventory, gunSystem]);

  useEffect(() => {
    const item = inventory[equippedIndex];
    if (item) {
      if (ALL_GUNS[item.id]) {
        gunSystem.equipGun(item.id);
      } else {
        gunSystem.equipGun(null);
      }
    }
  }, [equippedIndex, inventory]);

  // Update projectiles in game loop
  useEffect(() => {
    if (!hasStarted) return;
    const interval = setInterval(() => {
      gunSystem.updateProjectiles(16, sceneConfig.objects); // 16ms = ~60fps
    }, 16);
    return () => clearInterval(interval);
  }, [hasStarted, sceneConfig.objects, gunSystem]);

  return (
    <div className="app-container">
      <div className="game-wrapper">
        {/* Room Description moved to HUD Info */}
        <HUD
          player={{ ...player, health: playerHealth, maxHealth: 100 }}
          equippedGun={gunSystem.equippedGun}
          ammo={gunSystem.ammo}
        />

        <GameCanvas
          player={{ ...player, health: playerHealth, maxHealth: 100 }}
          objects={sceneConfig.objects}
          scene={scene}
          bgColor={sceneConfig.bgColor}
          bgImage={sceneConfig.bgImage}
          width={sceneConfig.width ?? CANVAS_WIDTH}
          height={sceneConfig.height ?? CANVAS_HEIGHT}
          equippedItem={gunSystem.equippedGun || undefined}
          onCanvasClick={handleCanvasClick}
          shotLine={shotLine}
          projectiles={gunSystem.projectiles}
          effects={gunSystem.effects}
        />

        {!hasStarted && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black z-100 cursor-pointer"
            onClick={handleStartGame}
          >
            <h1 className="text-8xl font-bold text-white tracking-tighter mb-4 text-glow italic select-none">
              Facility
            </h1>
            <p className="text-zinc-500 animate-pulse tracking-[0.5em] uppercase text-sm mt-4 select-none">
              [ Click to Initialize ]
            </p>
            <button
              className="mt-8 px-6 py-2 bg-zinc-800 text-white rounded-lg border border-zinc-600 hover:bg-zinc-700 transition cursor-pointer"
              style={{ fontSize: "1.1rem" }}
              onClick={(e) => {
                e.stopPropagation();
                window.location.search = "?admin=1";
              }}
            >
              Go to Admin Panel
            </button>
            <button
              className="mt-4 px-6 py-2 bg-blue-800 text-white rounded-lg border border-blue-600 hover:bg-blue-700 transition cursor-pointer"
              style={{ fontSize: "1.1rem" }}
              onClick={(e) => {
                e.stopPropagation();
                setHasStarted(true);
                setScene(GameScene.TESTDELETEAFTER);
              }}
            >
              Start in TestDeleteAfter Room
            </button>
          </div>
        )}

        {scene === GameScene.ENDING && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 text-center px-10">
            <h2 className="text-white text-3xl mb-6">TO BE CONTINUED...</h2>
            <p className="text-zinc-500 max-w-lg leading-relaxed">
              Damian and Darius entered the Antarctica Facility. What follows is
              a symphony of steel, ice, and calculated vengeance. RSI has no
              idea what's coming.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-10 text-zinc-700 hover:text-white underline"
            >
              Reset Mission
            </button>
          </div>
        )}

        <DialogueBox dialogue={dialogue} onComplete={handleDialogueComplete} />

        {/* Inventory HUD with animation */}
        {hasStarted &&
          scene !== GameScene.START &&
          scene !== GameScene.ENDING && (
            <div
              className={`absolute left-4 flex gap-2 items-center bg-black/60 border border-white/30 px-3 py-2 z-20
                ${
                  dialogue.active
                    ? "opacity-0 translate-y-10 pointer-events-none transition-none duration-0"
                    : "opacity-100 translate-y-0 transition-all duration-500 ease-in-out"
                } bottom-4`}
            >
              <span className="text-zinc-500 text-[10px] uppercase tracking-widest mr-1">
                INV
              </span>
              {inventory.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setEquippedIndex(i)}
                  className={`px-3 py-1.5 border text-xs font-bold tracking-wide transition-colors ${
                    i === equippedIndex
                      ? "border-white bg-white/20 text-white"
                      : "border-white/40 text-white/60 hover:border-white/60"
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          )}

        {/* HUD Info (toggle with 'i') */}
        {hasStarted &&
          !dialogue.active &&
          scene !== GameScene.START &&
          scene !== GameScene.ENDING && (
            <div
              className={`absolute top-4 left-4 bg-black/50 p-2 border border-white/20 text-xs text-white/50 max-w-xs transition-all duration-500 ease-in-out ${
                infoPanelVisible
                  ? "opacity-100 scale-100 pointer-events-auto"
                  : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
              <p>LOCATION: {scene.replace("_", " ")}</p>
              <p className="mt-2 text-white/40">[WASD] Move | [E] Interact</p>
              <p className="mt-2 text-white/70">{sceneConfig.description}</p>
              <p className="mt-2 text-zinc-400 text-xs">[I] Hide/Show Info</p>
            </div>
          )}

        {/* Debug Room Switcher */}
        {hasStarted && !dialogue.active && (
          <div
            className="fixed top-4 right-4 bg-black/70 border border-white/20 rounded-lg p-3 z-50 flex flex-col gap-2"
            style={{ maxWidth: 220 }}
          >
            <div className="text-xs text-white/60 mb-2">
              Room Debug Switcher
            </div>
            {Object.entries(SCENE_CONFIGS).map(([sceneKey, config]) => (
              <button
                key={sceneKey}
                className={`w-full px-2 py-1 rounded text-xs font-bold mb-1 border transition-colors ${
                  scene === sceneKey
                    ? "bg-blue-700 border-blue-400 text-white"
                    : "bg-zinc-800 border-zinc-600 text-zinc-200 hover:bg-zinc-700"
                }`}
                onClick={() => {
                  setTransitionPhase("out");
                  setTransitionTarget(sceneKey as GameScene);
                }}
              >
                {sceneKey.replace("_", " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Undertale-style room transition overlay */}
      {transitionPhase !== "none" && (
        <div
          className="fixed inset-0 pointer-events-none z-999 bg-black transition-opacity duration-0"
          style={{ opacity: transitionOpacity }}
        />
      )}

      {/* Background Ambience Layer */}
      <div className="fixed inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,#000_100%)]" />
    </div>
  );
};

export default App;
