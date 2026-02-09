import React, { useState, useEffect, useCallback, useRef } from "react";
import GameCanvas, { ShotLine } from "./components/GameCanvas";
import DialogueBox from "./components/DialogueBox";
import AdminPanel from "./components/AdminPanel";
import {
  GameScene,
  Player,
  DialogueState,
  InventoryItem,
  GameObject,
} from "./types";
import { SCENE_CONFIGS, TUTORIAL_TARGET_IDS } from "./rooms";

import { DEFAULT_INVENTORY, getItem } from "./items";
import { usePistol } from "./items/pistol";
import { audioService } from "./services/audioService";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";

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
  const [hasStarted, setHasStarted] = useState(false);
  const [scene, setScene] = useState<GameScene>(GameScene.START);
  const [player, setPlayer] = useState<Player>(() => {
    const startConfig = SCENE_CONFIGS[GameScene.START];
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
  const [tutorialTargetsShot, setTutorialTargetsShot] = useState<string[]>([]);
  const [tutorialPhoneShown, setTutorialPhoneShown] = useState(false);
  const [onEnterDialogueShownFor, setOnEnterDialogueShownFor] = useState<
    Set<GameScene>
  >(new Set());
  const [shotLine, setShotLine] = useState<ShotLine | null>(null);
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

  const keys = useRef<Record<string, boolean>>({});
  const baseConfig = SCENE_CONFIGS[scene];

  // Build TUTORIAL objects: no pistol_floor if picked up, hole only when all 3 targets shot
  const sceneConfig =
    scene !== GameScene.TUTORIAL
      ? baseConfig
      : (() => {
          const base = SCENE_CONFIGS[GameScene.TUTORIAL];
          const objects: GameObject[] = base.objects.filter((obj) => {
            if (obj.id === "pistol_floor" && tutorialPistolPickedUp)
              return false;
            if (obj.id === "hole" && tutorialTargetsShot.length < 3)
              return false;
            return true;
          });
          return { ...base, objects };
        })();

  const INTRO_LINES = [
    "In a world where progress is a ritual of ownership...",
    "Two shadows align against the light of a Dying Sun.",
    "Damian. Darius.",
    "Sociopathy is their only defense against a heartless monopoly.",
    "Proceed with the mission.",
  ];

  // Reset BGM and player position when scene actually changes (not during transitions)
  useEffect(() => {
    if (!hasStarted) return;
    // Only reset when scene actually changed
    const sceneChanged = prevSceneRef.current !== scene;
    if (sceneChanged) {
      const config = SCENE_CONFIGS[scene];
      setPlayer((prev) => ({
        ...prev,
        x: config.spawnPoint?.x ?? 0,
        y: config.spawnPoint?.y ?? 0,
      }));
      if (lastBgmRef.current !== config.bgMusic) {
        lastBgmRef.current = config.bgMusic;
        audioService.playBgm(config.bgMusic);
      }
      prevSceneRef.current = scene;
    }
  }, [scene, hasStarted]);

  // Phone notification when entering TUTORIAL (once)
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
              setPlayer((prev) => ({
                ...prev,
                x: nextConfig.spawnPoint.x,
                y: nextConfig.spawnPoint.y,
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

  const triggerDialogue = (speaker: string, text: string[]) => {
    setDialogue({ speaker, text, currentIndex: 0, active: true });
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

    for (const obj of sceneConfig.objects) {
      const dx = player.x + player.width / 2 - (obj.x + obj.width / 2);
      const dy = player.y + player.height / 2 - (obj.y + obj.height / 2);
      const distance = Math.hypot(dx, dy);

      if (distance < 60) {
        if (obj.type === "pickup" && obj.id === "pistol_floor") {
          setTutorialPistolPickedUp(true);
          setInventory((prev) => [...prev, getItem("pistol")!]);
          if (obj.dialogue) triggerDialogue(obj.name || "", obj.dialogue);
          return;
        }
        if (obj.type === "trigger" && obj.triggerScene) {
          startTransition(obj.triggerScene);
          return;
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
    const move = () => {
      if (
        !hasStarted ||
        dialogue.active ||
        scene === GameScene.START ||
        scene === GameScene.ENDING
      )
        return;

      setPlayer((prev) => {
        let dx = 0;
        let dy = 0;
        if (keys.current["w"] || keys.current["arrowup"]) dy -= prev.speed;
        if (keys.current["s"] || keys.current["arrowdown"]) dy += prev.speed;
        if (keys.current["a"] || keys.current["arrowleft"]) dx -= prev.speed;
        if (keys.current["d"] || keys.current["arrowright"]) dx += prev.speed;

        let newX = prev.x + dx;
        let newY = prev.y + dy;

        // Room boundary collision (dynamic per room)
        const roomWidth = sceneConfig.width ?? CANVAS_WIDTH;
        const roomHeight = sceneConfig.height ?? CANVAS_HEIGHT;

        newX = Math.max(0, Math.min(roomWidth - prev.width, newX));
        newY = Math.max(0, Math.min(roomHeight - prev.height, newY));

        // Collidable object collision detection
        const collidableObjects = sceneConfig.objects.filter(
          (obj) => obj.collidable,
        );

        for (const obj of collidableObjects) {
          // Check if player would collide with this object
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

            // Find smallest overlap to determine collision side
            const minOverlap = Math.min(
              overlapLeft,
              overlapRight,
              overlapTop,
              overlapBottom,
            );

            if (minOverlap === overlapLeft) {
              newX = obj.x - prev.width; // Collision from left
            } else if (minOverlap === overlapRight) {
              newX = obj.x + obj.width; // Collision from right
            } else if (minOverlap === overlapTop) {
              newY = obj.y - prev.height; // Collision from top
            } else if (minOverlap === overlapBottom) {
              newY = obj.y + obj.height; // Collision from bottom
            }
          }
        }

        // Floor border collision: player can walk inside, but not cross the border
        const floorObjects = sceneConfig.objects.filter(
          (obj) => obj.type === "floor",
        );
        // Allow movement if inside any floor; only clamp if outside all floors
        if (floorObjects.length > 0) {
          const insideAny = floorObjects.some(
            (floor) =>
              newX >= floor.x &&
              newX + prev.width <= floor.x + floor.width &&
              newY >= floor.y &&
              newY + prev.height <= floor.y + floor.height,
          );
          if (!insideAny) {
            // Find the closest floor and clamp to its border
            let minDist = Infinity;
            let bestFloor = floorObjects[0];
            for (const floor of floorObjects) {
              // Distance from player center to floor center
              const px = newX + prev.width / 2;
              const py = newY + prev.height / 2;
              const fx = floor.x + floor.width / 2;
              const fy = floor.y + floor.height / 2;
              const dist = Math.abs(px - fx) + Math.abs(py - fy);
              if (dist < minDist) {
                minDist = dist;
                bestFloor = floor;
              }
            }
            // Clamp to closest floor
            newX = Math.max(
              bestFloor.x,
              Math.min(bestFloor.x + bestFloor.width - prev.width, newX),
            );
            newY = Math.max(
              bestFloor.y,
              Math.min(bestFloor.y + bestFloor.height - prev.height, newY),
            );
          }
        }

        // Automatic doorway transition (walk through without pressing E)
        const doorways = sceneConfig.objects.filter(
          (obj) => obj.type === "doorway" && obj.triggerScene,
        );

        for (const doorway of doorways) {
          // Check if player is overlapping with doorway
          const isOverlapping =
            newX < doorway.x + doorway.width &&
            newX + prev.width > doorway.x &&
            newY < doorway.y + doorway.height &&
            newY + prev.height > doorway.y;

          if (isOverlapping && doorway.triggerScene) {
            // Trigger room transition automatically
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
    };

    const interval = setInterval(move, 1000 / 60);
    return () => clearInterval(interval);
  }, [
    dialogue.active,
    scene,
    hasStarted,
    sceneConfig.objects,
    startTransition,
  ]);

  const handleStartGame = () => {
    audioService.resume();
    setHasStarted(true);
    setScene(GameScene.TUTORIAL);
  };

  const handleCanvasClick = useCallback(
    (canvasX: number, canvasY: number) => {
      if (dialogue.active) return;
      const item = inventory[equippedIndex];
      if (!item) return;
      // Delegate item actions
      if (item.id === "pistol") {
        const result = usePistol(
          player,
          canvasX,
          canvasY,
          sceneConfig.objects,
          tutorialTargetsShot,
          TUTORIAL_TARGET_IDS,
        );
        setShotLine(result.shotLine);
        if (result.targetHitId) {
          setTutorialTargetsShot((prev) => [...prev, result.targetHitId!]);
        }
        setTimeout(() => setShotLine(null), 250);
        return;
      }
    },
    [
      scene,
      dialogue.active,
      inventory,
      equippedIndex,
      tutorialTargetsShot,
      player.x,
      player.y,
      player.width,
      player.height,
    ],
  );

  return (
    <div className="app-container">
      <div className="game-wrapper">
        {/* Room Description moved to HUD Info */}
        <GameCanvas
          player={player}
          objects={sceneConfig.objects}
          scene={scene}
          bgColor={sceneConfig.bgColor}
          width={sceneConfig.width ?? CANVAS_WIDTH}
          height={sceneConfig.height ?? CANVAS_HEIGHT}
          equippedItem={inventory[equippedIndex]?.id}
          onCanvasClick={handleCanvasClick}
          shotLine={shotLine}
          targetsShot={tutorialTargetsShot}
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

        {/* HUD Info */}
        {hasStarted &&
          !dialogue.active &&
          scene !== GameScene.START &&
          scene !== GameScene.ENDING && (
            <div className="absolute top-4 left-4 bg-black/50 p-2 border border-white/20 text-xs text-white/50 max-w-xs">
              <p>LOCATION: {scene.replace("_", " ")}</p>
              <p>OBJ: Find Darius / Board Plane</p>
              <p className="mt-2 text-white/40">[WASD] Move | [E] Interact</p>
              <p className="mt-2 text-white/70">{sceneConfig.description}</p>
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
