import React, { useState, useCallback, useRef, useEffect } from "react";
import type {
  RoomConfig,
  GameObject,
  PixelSprite,
  InventoryItem,
} from "../types";
import { GameScene } from "../types";
import { SCENE_CONFIGS } from "../rooms";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../constants";
import { ITEMS } from "../items";

const ADMIN_API = "http://localhost:3001";
const SCENE_KEYS = Object.keys(SCENE_CONFIGS) as GameScene[];

type RoomConfigEditable = RoomConfig & {
  width?: number;
  height?: number;
};

function cloneConfig(c: RoomConfig): RoomConfigEditable {
  return {
    ...c,
    spawnPoint: { ...c.spawnPoint },
    objects: c.objects.map((o) => ({
      ...o,
      dialogue: o.dialogue ? [...o.dialogue] : undefined,
      collidable: o.collidable ?? false,
      sprite: o.sprite
        ? {
            w: o.sprite.w,
            h: o.sprite.h,
            pixels: [...o.sprite.pixels],
          }
        : undefined,
      spriteRepeat: o.spriteRepeat ?? false,
      zIndex: o.zIndex ?? 0,
      itemId: o.itemId,
    })),
    onEnterDialogue: c.onEnterDialogue
      ? {
          speaker: c.onEnterDialogue.speaker,
          lines: [...c.onEnterDialogue.lines],
        }
      : undefined,
    width: c.width ?? CANVAS_WIDTH,
    height: c.height ?? CANVAS_HEIGHT,
  };
}

const OBJECT_TYPES: GameObject["type"][] = [
  "npc",
  "prop",
  "trigger",
  "save",
  "pickup",
  "doorway",
  "floor",
  "gun",
  "enemy",
  "spawn_marker", // ADD THIS
];

export default function AdminPanel() {
  const [sceneKey, setSceneKey] = useState<GameScene | "NEW">(SCENE_KEYS[0]);
  const [deleteStatus, setDeleteStatus] = useState<
    "idle" | "deleting" | "ok" | "error"
  >("idle");
  const [deleteMessage, setDeleteMessage] = useState("");
  // Delete room handler
  const handleDeleteRoom = useCallback(async () => {
    if (sceneKey === "NEW") return;
    if (
      !window.confirm(
        `Are you sure you want to delete the room '${sceneKey}'? This cannot be undone.`,
      )
    )
      return;
    setDeleteStatus("deleting");
    setDeleteMessage("");
    try {
      const res = await fetch(`${ADMIN_API}/api/delete-room`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneKey }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDeleteStatus("error");
        setDeleteMessage(data.error || res.statusText);
        return;
      }
      setDeleteStatus("ok");
      setDeleteMessage("Room deleted. Refreshing list…");
      // Wait a moment for backend to sync, then reload SCENE_CONFIGS
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (e) {
      setDeleteStatus("error");
      setDeleteMessage("Cannot reach admin server. Run: npm run admin");
    }
  }, [sceneKey]);
  const [newRoomKey, setNewRoomKey] = useState("");
  const [config, setConfig] = useState<RoomConfigEditable>(() =>
    cloneConfig(SCENE_CONFIGS[SCENE_KEYS[0]]),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "ok" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "running" | "ok" | "error"
  >("idle");
  const [drag, setDrag] = useState<{
    id: string;
    startX: number;
    startY: number;
    objX: number;
    objY: number;
    width: number;
    height: number;
    resizeDir?: "right" | "bottom" | "corner";
    isSpawn?: boolean;
  } | null>(null);
  /** Zoom for map preview (1 = 100%) */
  const [mapZoom, setMapZoom] = useState(1);
  /** Draw floor mode: drag on map to create walkable floor (Undertale-style) */
  const [drawFloorMode, setDrawFloorMode] = useState(false);
  const [drawFloorStart, setDrawFloorStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [drawFloorCurrent, setDrawFloorCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [customItems, setCustomItems] = useState<InventoryItem[]>([]);
  const [textureList, setTextureList] = useState<string[]>([]);
  const [itemsSaveStatus, setItemsSaveStatus] = useState<
    "idle" | "saving" | "ok" | "error"
  >("idle");
  const [itemsSaveMessage, setItemsSaveMessage] = useState("");
  const [spriteEditorOpen, setSpriteEditorOpen] = useState(false);
  const [editingSprite, setEditingSprite] = useState<PixelSprite | null>(null);
  const [spritePaintColor, setSpritePaintColor] = useState("#ffffff");
  const roomRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const mapZoomRef = useRef(1);
  mapZoomRef.current = mapZoom;

  const roomWidth = config.width ?? CANVAS_WIDTH;
  const roomHeight = config.height ?? CANVAS_HEIGHT;
  const scale = Math.min(1, 600 / roomWidth, 400 / roomHeight);
  scaleRef.current = scale;

  useEffect(() => {
    fetch(`${ADMIN_API}/api/items`)
      .then((r) => r.json())
      .then((data) =>
        setCustomItems(Array.isArray(data.items) ? data.items : []),
      )
      .catch(() => setCustomItems([]));
    fetch(`${ADMIN_API}/api/textures`)
      .then((r) => r.json())
      .then((data) =>
        setTextureList(Array.isArray(data.textures) ? data.textures : []),
      )
      .catch(() => setTextureList([]));
  }, []);

  function createEmptySprite(w: number, h: number): PixelSprite {
    return { w, h, pixels: Array(w * h).fill("") };
  }

  useEffect(() => {
    if (sceneKey === "NEW") {
      setConfig({
        bgMusic: "/OST/CHILL OMG_2.ogg",
        spawnPoint: { x: 100, y: 100 },
        bgColor: "#2d3436",
        description: "New room",
        objects: [],
        width: CANVAS_WIDTH,
        height: CANVAS_HEIGHT,
      });
      setSelectedId(null);
      return;
    }
    const c = SCENE_CONFIGS[sceneKey];
    if (c) {
      setConfig(cloneConfig(c));
    }
    setSelectedId(null);
  }, [sceneKey]);

  const selectedObject = config.objects.find((o) => o.id === selectedId);

  const updateConfig = useCallback(
    (updater: (c: RoomConfigEditable) => RoomConfigEditable) => {
      setConfig((c) => updater({ ...c }));
    },
    [],
  );

  const updateRoom = useCallback(
    (patch: Partial<RoomConfigEditable>) => {
      updateConfig((c) => ({ ...c, ...patch }));
    },
    [updateConfig],
  );

  /** Convert mouse event (relative to room area) to room coordinates */
  const getRoomCoords = useCallback(
    (e: { clientX: number; clientY: number }) => {
      const el = roomRef.current;
      if (!el) return { x: 0, y: 0 };
      const rect = el.getBoundingClientRect();
      const s = scaleRef.current * mapZoomRef.current;
      const x = Math.max(0, Math.min(roomWidth, (e.clientX - rect.left) / s));
      const y = Math.max(0, Math.min(roomHeight, (e.clientY - rect.top) / s));
      return { x: Math.round(x), y: Math.round(y) };
    },
    [roomWidth, roomHeight],
  );

  const addObject = useCallback(() => {
    const id = `obj_${Date.now()}`;
    updateConfig((c) => ({
      ...c,
      objects: [
        ...c.objects,
        {
          id,
          x: 100,
          y: 100,
          width: 50,
          height: 50,
          color: "#636e72",
          type: "prop",
          name: "New object",
        },
      ],
    }));
    setSelectedId(id);
  }, [updateConfig]);

  const deleteObject = useCallback(
    (id: string) => {
      updateConfig((c) => ({
        ...c,
        objects: c.objects.filter((o) => o.id !== id),
      }));
      if (selectedId === id) setSelectedId(null);
    },
    [updateConfig, selectedId],
  );

  const updateObject = useCallback(
    (id: string, patch: Partial<GameObject>) => {
      updateConfig((c) => ({
        ...c,
        objects: c.objects.map((o) => (o.id === id ? { ...o, ...patch } : o)),
      }));
    },
    [updateConfig],
  );

  const handleSave = useCallback(async () => {
    let key =
      sceneKey === "NEW"
        ? newRoomKey.trim().toUpperCase().replace(/\s+/g, "_")
        : sceneKey;
    if (!key) {
      setSaveMessage("Enter a room key for new room (e.g. MY_ROOM)");
      setSaveStatus("error");
      return;
    }
    // For new rooms, always use lowercase export name
    let exportName = key;
    if (sceneKey === "NEW") {
      exportName = key.toLowerCase();
    }
    setSaveStatus("saving");
    setSaveMessage("");
    const safeConfig = { ...config };
    try {
      const res = await fetch(`${ADMIN_API}/api/save-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneKey: key, config: safeConfig, exportName }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveMessage(data.error || res.statusText);
        setSaveStatus("error");
        return;
      }
      setSaveStatus("ok");
      setSaveMessage(
        `Saved ${data.file || key}. Refresh the page to see the new room in the list.`,
      );
      if (sceneKey === "NEW") {
        setNewRoomKey("");
        try {
          await fetch(`${ADMIN_API}/api/sync`, { method: "POST" });
        } catch {
          setSaveMessage(
            "Saved. Run Sync (or npm run admin) then refresh to see the new room.",
          );
        }
      }
    } catch (e) {
      setSaveMessage("Cannot reach admin server. Run: npm run admin");
      setSaveStatus("error");
    }
  }, [sceneKey, newRoomKey, config]);

  const handleSync = useCallback(async () => {
    setSyncStatus("running");
    try {
      const res = await fetch(`${ADMIN_API}/api/sync`, { method: "POST" });
      await res.json().catch(() => ({}));
      if (!res.ok) {
        setSyncStatus("error");
        return;
      }
      setSyncStatus("ok");
      setTimeout(() => setSyncStatus("idle"), 2000);
    } catch {
      setSyncStatus("error");
    }
  }, []);

  const handleCanvasMouseDown = useCallback(
    (
      e: React.MouseEvent,
      id: string,
      isSpawn = false,
      resizeDir?: "right" | "bottom" | "corner",
    ) => {
      if (isSpawn) {
        e.preventDefault();
        e.stopPropagation();
        setDrag({
          id: "spawn",
          startX: e.clientX,
          startY: e.clientY,
          objX: config.spawnPoint.x,
          objY: config.spawnPoint.y,
          width: 10,
          height: 10,
          isSpawn: true,
        });
        return;
      }
      const obj = config.objects.find((o) => o.id === id);
      if (!obj) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedId(id);
      setDrag({
        id,
        startX: e.clientX,
        startY: e.clientY,
        objX: obj.x,
        objY: obj.y,
        width: obj.width,
        height: obj.height,
        resizeDir,
      });
    },
    [config.objects, config.spawnPoint],
  );

  useEffect(() => {
    if (!drawFloorStart) return;
    const onMove = (e: MouseEvent) => {
      const el = roomRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const s = scaleRef.current * mapZoomRef.current;
      const x = Math.max(0, Math.min(roomWidth, (e.clientX - rect.left) / s));
      const y = Math.max(0, Math.min(roomHeight, (e.clientY - rect.top) / s));
      setDrawFloorCurrent({ x: Math.round(x), y: Math.round(y) });
    };
    const onUp = () => {
      if (drawFloorStart && drawFloorCurrent) {
        const x = Math.min(drawFloorStart.x, drawFloorCurrent.x);
        const y = Math.min(drawFloorStart.y, drawFloorCurrent.y);
        const w = Math.max(16, Math.abs(drawFloorCurrent.x - drawFloorStart.x));
        const h = Math.max(16, Math.abs(drawFloorCurrent.y - drawFloorStart.y));
        const id = `floor_${Date.now()}`;
        updateConfig((c) => ({
          ...c,
          objects: [
            ...c.objects,
            {
              id,
              x,
              y,
              width: w,
              height: h,
              color: "#4a5568",
              type: "floor",
              name: "Walkable floor",
            },
          ],
        }));
        setSelectedId(id);
      }
      setDrawFloorStart(null);
      setDrawFloorCurrent(null);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drawFloorStart, drawFloorCurrent, roomWidth, roomHeight, updateConfig]);

  useEffect(() => {
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const s = scaleRef.current || 1;
      const z = mapZoomRef.current || 1;
      const dx = (e.clientX - drag.startX) / (s * z);
      const dy = (e.clientY - drag.startY) / (s * z);
      const roomW = roomRef.current
        ? roomRef.current.offsetWidth / s
        : roomWidth;
      const roomH = roomRef.current
        ? roomRef.current.offsetHeight / s
        : roomHeight;
      if (drag.resizeDir) {
        // Resizing
        let newWidth = drag.width;
        let newHeight = drag.height;
        if (drag.resizeDir === "right" || drag.resizeDir === "corner") {
          newWidth = Math.max(10, Math.min(roomW - drag.objX, drag.width + dx));
        }
        if (drag.resizeDir === "bottom" || drag.resizeDir === "corner") {
          newHeight = Math.max(
            10,
            Math.min(roomH - drag.objY, drag.height + dy),
          );
        }
        updateObject(drag.id, {
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      } else {
        // Moving
        const nx = Math.max(0, Math.min(roomW - drag.width, drag.objX + dx));
        const ny = Math.max(0, Math.min(roomH - drag.height, drag.objY + dy));
        if (drag.isSpawn) {
          updateRoom({
            spawnPoint: {
              ...config.spawnPoint,
              x: Math.round(nx),
              y: Math.round(ny),
            },
          });
        } else {
          updateObject(drag.id, { x: Math.round(nx), y: Math.round(ny) });
        }
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [
    drag,
    updateObject,
    updateRoom,
    config.spawnPoint,
    roomWidth,
    roomHeight,
  ]);

  function backToGame() {
    window.location.href = "/";
  }

  return (
    <div className="admin-panel">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <h1 className="admin-title">Admin Panel</h1>
          <button
            type="button"
            className="admin-back cursor-pointer"
            onClick={backToGame}
          >
            ← Back to game
          </button>
        </div>
        <div className="admin-sidebar-body">
          <label className="admin-label">Rooms</label>
          <select
            className="admin-select"
            value={sceneKey}
            onChange={(e) => setSceneKey(e.target.value as GameScene | "NEW")}
          >
            {SCENE_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
            <option value="NEW">+ New room</option>
          </select>
          {sceneKey === "NEW" && (
            <input
              className="admin-input"
              placeholder="Room key (e.g. MY_OFFICE)"
              value={newRoomKey}
              onChange={(e) => setNewRoomKey(e.target.value)}
            />
          )}
        </div>
        <div className="admin-sidebar-footer">
          {sceneKey !== "NEW" && (
            <button
              type="button"
              className="admin-btn admin-btn-delete"
              style={{
                background: "var(--admin-danger)",
                color: "#fff",
                marginBottom: 8,
              }}
              onClick={handleDeleteRoom}
              disabled={deleteStatus === "deleting"}
            >
              {deleteStatus === "deleting" ? "Deleting…" : "Delete room"}
            </button>
          )}
          <button
            type="button"
            className="admin-btn admin-btn-save"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
          >
            {saveStatus === "saving" ? "Saving…" : "Save to code"}
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-sync"
            onClick={handleSync}
            disabled={syncStatus === "running"}
          >
            {syncStatus === "running" ? "Syncing…" : "Sync types & index"}
          </button>
          {saveMessage && (
            <p
              className={
                saveStatus === "error"
                  ? "admin-message admin-message-error"
                  : "admin-message"
              }
            >
              {saveMessage}
            </p>
          )}
          {deleteMessage && (
            <p
              className={
                deleteStatus === "error"
                  ? "admin-message admin-message-error"
                  : "admin-message"
              }
            >
              {deleteMessage}
            </p>
          )}
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-grid">
          <section className="admin-card">
            <h2 className="admin-card-title">Room properties</h2>
            <div className="admin-form-grid">
              <label className="admin-form-label">Background color</label>
              <input
                type="color"
                className="admin-color"
                value={config.bgColor}
                onChange={(e) => updateRoom({ bgColor: e.target.value })}
              />
              <label className="admin-form-label admin-form-label-full">
                Description
              </label>
              <input
                className="admin-input admin-input-full"
                value={config.description}
                onChange={(e) => updateRoom({ description: e.target.value })}
              />
              <label className="admin-form-label admin-form-label-full">
                Background image (optional)
              </label>
              <select
                className="admin-input admin-input-full"
                value={config.bgImage ?? ""}
                onChange={(e) =>
                  updateRoom({ bgImage: e.target.value || undefined })
                }
                title="Pick a texture from the Textures folder"
              >
                <option value="">— None —</option>
                {config.bgImage && !textureList.includes(config.bgImage) && (
                  <option value={config.bgImage}>{config.bgImage}</option>
                )}
                {textureList.map((p) => (
                  <option key={p} value={p}>
                    {p.replace(/^\/Textures\//, "")}
                  </option>
                ))}
              </select>
              <input
                className="admin-input admin-input-full"
                placeholder="Or type a custom path (e.g. /other/image.png)"
                value={
                  config.bgImage && !textureList.includes(config.bgImage)
                    ? (config.bgImage ?? "")
                    : ""
                }
                onChange={(e) =>
                  updateRoom({ bgImage: e.target.value || undefined })
                }
                style={{ marginTop: 4 }}
                title="Use if your image is not in the Textures folder"
              />
              <label className="admin-form-label">Map width</label>
              <input
                type="number"
                className="admin-input"
                value={roomWidth}
                onChange={(e) =>
                  updateRoom({ width: Number(e.target.value) || undefined })
                }
              />
              <label className="admin-form-label">Map height</label>
              <input
                type="number"
                className="admin-input"
                value={roomHeight}
                onChange={(e) =>
                  updateRoom({ height: Number(e.target.value) || undefined })
                }
              />
              <label className="admin-form-label">Spawn X</label>
              <input
                type="number"
                className="admin-input"
                value={config.spawnPoint.x}
                onChange={(e) =>
                  updateRoom({
                    spawnPoint: {
                      ...config.spawnPoint,
                      x: Number(e.target.value),
                    },
                  })
                }
              />
              <label className="admin-form-label">Spawn Y</label>
              <input
                type="number"
                className="admin-input"
                value={config.spawnPoint.y}
                onChange={(e) =>
                  updateRoom({
                    spawnPoint: {
                      ...config.spawnPoint,
                      y: Number(e.target.value),
                    },
                  })
                }
              />
              <label className="admin-form-label admin-form-label-full">
                BG music path
              </label>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <select
                  className="admin-input admin-input-full"
                  value={config.bgMusic}
                  onChange={(e) => updateRoom({ bgMusic: e.target.value })}
                >
                  <option value="">Select music…</option>
                  {[
                    "! 8 bit type beat 2_4.ogg",
                    "! 8bit real_2 MASTER.ogg",
                    "! AFRO LOL RAW.ogg",
                    "! AFRO LOL.ogg",
                    "! FUTURISTIC BEAT WTF.ogg",
                    "! GUANTANAMERA_5.ogg",
                    "! HAloween type beat_9 v2.ogg",
                    "! Orchestal Dream_6.ogg",
                    "! PHONK BRAZIL 2.ogg",
                    "! PHONK REAL.ogg",
                    "! TANGO_5.ogg",
                    "! WIDE MARIMBA TYPE BEAT_3.ogg",
                    "! YEAT BEAT RARO_3.ogg",
                    "!!!!HEAVEN final.ogg",
                    "!8bit cafe try.ogg",
                    "!DISCO WTF.ogg",
                    "!ELECTRIC BEAT_8.ogg",
                    "!ELECTRO BUT IN A BATHROOM.ogg",
                    "!FUTURE HOUSE_2.ogg",
                    "!phonk ronaldinho piranha brazil_5.ogg",
                    "!RAGE BEAT.ogg",
                    "!TECHNO WTF!!!!_3.ogg",
                    "8bit type beat_8.ogg",
                    "9 bit lol beat_2.ogg",
                    "90s chords sped up.ogg",
                    "90s chords.ogg",
                    "90s try.ogg",
                    "AMBIENVE BEAT_2 v2.ogg",
                    "ANIME OP ACT II vIII.ogg",
                    "Arcade type beat - Prod(Adri).ogg",
                    "beat china_2 (Keyscape Piano).ogg",
                    "BEAT PRUEBA nose anime op 2.ogg",
                    "BEAT PRUEBA nose_2 v3.ogg",
                    "BEAT TRY.ogg",
                    "BenjiCold_Template.ogg",
                    "Bosa nova 4 sped up.ogg",
                    "BOSSA NOBA.ogg",
                    "Bossa nova act II_2.ogg",
                    "Bossa nova tutorial.ogg",
                    "Bossa nova tutorial_2.ogg",
                    "Bosssa nova op300.ogg",
                    "Breaking the sea!.ogg",
                    "CARNIVAL.ogg",
                    "CASTLES IN THE SKY !_2.ogg",
                    "CHILL ASH OMG 2 Final.ogg",
                    "CHILL OMG_2.ogg",
                    "Chill song_4 (Cat Ballad Accoustic v2).ogg",
                    "Chill song_4.ogg",
                    "Chill song_8 V2.ogg",
                    "Circus hoodtrap.ogg",
                    "DISKO TRY SYTRUS LOL_4.ogg",
                    "DISKO TRY SYTRUS LOL_5 (+ Sidechain).ogg",
                    "Faster than the light.ogg",
                    "FINAL BOSS MASTER.ogg",
                    "FRUITY AWGO_2.ogg",
                    "HE SOUND BEAT.ogg",
                    "hh TYPE BEAT.ogg",
                    "IAMUSIC type beat.ogg",
                    "IAN WTFFF.ogg",
                    "INTENTO WIZARD BEAT.ogg",
                    "jazz (normal).ogg",
                    "jazz preset_2.ogg",
                    "JAZZ REAL.ogg",
                    "JAZZ REAL_4 v2.ogg",
                    "LABS (consolidated)_2.ogg",
                    "MAGIKAL 8bit.ogg",
                    "MELODY 7.ogg",
                    "Morning Weather Chanel.ogg",
                    "NEW JAZZ BEAT TRY_2 organ 2.0.ogg",
                    "NEW JAZZ BEAT TRY_4.ogg",
                    "NEW JAZZ PETIT VERSION_7.ogg",
                    "NOSTALGIC TYPE BEAT.ogg",
                    "Notification.ogg",
                    "NotificationPhone.ogg",
                    "PIANO KEYZONIC_3.ogg",
                    "PURITY BELLS BEAT_2.ogg",
                    "PVZ type beat 2.ogg",
                    "SAX BEAT.ogg",
                    "SAX BEAT_6 (anime op final).ogg",
                    "SKY BEAT 2.ogg",
                    "STAR BEAT_2 V2.ogg",
                    "STAR BEAT_4.ogg",
                    "SWICH 4! BEAT v2.ogg",
                    "SYNTH 1.ogg",
                    "UK DRILL MELODIC.ogg",
                    "Videogame track nostalgia.ogg",
                    "Welcome to the party SIdechain.ogg",
                    "Wesather chanel beat_5.ogg",
                    "WOnderful Orchesta, realities of life op2.ogg",
                    "YEAT TYPE 5.ogg",
                  ].map((f) => (
                    <option key={f} value={"/OST/" + f}>
                      {f}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => {
                    const audio = document.getElementById(
                      "admin-music-preview",
                    ) as HTMLAudioElement;
                    if (audio) {
                      audio.src = config.bgMusic ? config.bgMusic : "";
                      audio.play();
                    }
                  }}
                >
                  Preview
                </button>
                <button
                  type="button"
                  className="cursor-pointer"
                  onClick={() => {
                    const audio = document.getElementById(
                      "admin-music-preview",
                    ) as HTMLAudioElement;
                    if (audio) audio.pause();
                  }}
                >
                  Stop
                </button>
                <audio id="admin-music-preview" style={{ display: "none" }} />
              </div>
              <label className="admin-form-label admin-form-label-full">
                On-enter dialogue (optional)
              </label>
              <input
                className="admin-input admin-input-full"
                placeholder="Speaker name"
                value={config.onEnterDialogue?.speaker ?? ""}
                onChange={(e) =>
                  updateRoom({
                    onEnterDialogue: {
                      speaker: e.target.value,
                      lines: config.onEnterDialogue?.lines ?? [],
                    },
                  })
                }
              />
              <textarea
                className="admin-textarea admin-input-full"
                placeholder="One line per dialogue"
                value={(config.onEnterDialogue?.lines ?? []).join("\n")}
                onChange={(e) =>
                  updateRoom({
                    onEnterDialogue: {
                      speaker: config.onEnterDialogue?.speaker ?? "",
                      lines: e.target.value.split("\n").filter(Boolean),
                    },
                  })
                }
              />
            </div>
          </section>

          <section className="admin-card">
            <h2 className="admin-card-title">Custom items</h2>
            <p
              style={{
                fontSize: 12,
                color: "var(--admin-muted, #666)",
                marginBottom: 8,
              }}
            >
              Create items that can be added to inventory (e.g. keys, tools).
              Save items to sync to the game.
            </p>
            <div className="admin-object-list">
              {customItems.map((it, idx) => (
                <div key={it.id} className="admin-object-item">
                  <input
                    className="admin-input"
                    style={{ flex: 1, minWidth: 0 }}
                    value={it.id}
                    onChange={(e) => {
                      const next = [...customItems];
                      next[idx] = { ...next[idx], id: e.target.value };
                      setCustomItems(next);
                    }}
                    placeholder="id"
                  />
                  <input
                    className="admin-input"
                    style={{ flex: 1, minWidth: 0 }}
                    value={it.name}
                    onChange={(e) => {
                      const next = [...customItems];
                      next[idx] = { ...next[idx], name: e.target.value };
                      setCustomItems(next);
                    }}
                    placeholder="name"
                  />
                  <button
                    type="button"
                    className="admin-object-item-delete"
                    onClick={() =>
                      setCustomItems(customItems.filter((_, i) => i !== idx))
                    }
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-add"
              onClick={() =>
                setCustomItems([
                  ...customItems,
                  { id: `item_${Date.now()}`, name: "New item" },
                ])
              }
            >
              + Add item
            </button>
            <button
              type="button"
              className="admin-btn admin-btn-save"
              style={{ marginTop: 8 }}
              onClick={async () => {
                setItemsSaveStatus("saving");
                setItemsSaveMessage("");
                try {
                  const res = await fetch(`${ADMIN_API}/api/save-items`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ items: customItems }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) {
                    setItemsSaveStatus("error");
                    setItemsSaveMessage(data.error || "Failed to save");
                    return;
                  }
                  setItemsSaveStatus("ok");
                  setItemsSaveMessage(
                    "Items saved. Refresh the game to see them.",
                  );
                  setTimeout(() => setItemsSaveStatus("idle"), 3000);
                } catch {
                  setItemsSaveStatus("error");
                  setItemsSaveMessage("Cannot reach admin server.");
                }
              }}
              disabled={itemsSaveStatus === "saving"}
            >
              {itemsSaveStatus === "saving" ? "Saving…" : "Save items"}
            </button>
            {itemsSaveMessage && (
              <p
                className={
                  itemsSaveStatus === "error"
                    ? "admin-message admin-message-error"
                    : "admin-message"
                }
              >
                {itemsSaveMessage}
              </p>
            )}
          </section>

          <section className="admin-card">
            <h2 className="admin-card-title">Objects</h2>
            <div className="admin-object-list">
              {config.objects.map((obj) => (
                <div
                  key={obj.id}
                  className={
                    selectedId === obj.id
                      ? "admin-object-item admin-object-item-selected"
                      : "admin-object-item"
                  }
                >
                  <button
                    type="button"
                    className="admin-object-item-btn"
                    onClick={() => setSelectedId(obj.id)}
                  >
                    {obj.name || obj.id} ({obj.type})
                  </button>
                  <button
                    type="button"
                    className="admin-object-item-delete"
                    onClick={() => deleteObject(obj.id)}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-btn admin-btn-add"
              onClick={addObject}
            >
              + Add object
            </button>

            {selectedObject && (
              <div className="admin-edit-object">
                <h3 className="admin-edit-title">Edit: {selectedObject.id}</h3>
                <div className="admin-form-grid admin-form-grid-dense">
                  <label className="admin-form-label">ID</label>
                  <input
                    className="admin-input"
                    value={selectedObject.id}
                    onChange={(e) =>
                      updateObject(selectedObject.id, { id: e.target.value })
                    }
                  />
                  <label className="admin-form-label">Name</label>
                  <input
                    className="admin-input"
                    value={selectedObject.name ?? ""}
                    onChange={(e) =>
                      updateObject(selectedObject.id, { name: e.target.value })
                    }
                  />
                  <label className="admin-form-label">Type</label>
                  <select
                    className="admin-input"
                    value={selectedObject.type}
                    onChange={(e) => {
                      const newType = e.target.value as GameObject["type"];
                      const patch: Partial<GameObject> = { type: newType };
                      // Set default enemy AI properties when changing to enemy type
                      if (newType === "enemy") {
                        patch.health = selectedObject.health ?? 100;
                        patch.maxHealth = selectedObject.maxHealth ?? 100;
                        patch.aiType = selectedObject.aiType ?? "stationary";
                        patch.speed = selectedObject.speed ?? 2;
                        patch.detectionRange = selectedObject.detectionRange ?? 250;
                        patch.attackRange = selectedObject.attackRange ?? 40;
                        patch.attackDamage = selectedObject.attackDamage ?? 10;
                        patch.collidable = true;
                      }
                      updateObject(selectedObject.id, patch);
                    }}
                  >
                    {OBJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <label className="admin-form-label">Color</label>
                  <input
                    type="color"
                    className="admin-color"
                    value={selectedObject.color}
                    onChange={(e) =>
                      updateObject(selectedObject.id, { color: e.target.value })
                    }
                  />
                  <label className="admin-form-label">X</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={selectedObject.x}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        x: Number(e.target.value),
                      })
                    }
                  />
                  <label className="admin-form-label">Y</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={selectedObject.y}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        y: Number(e.target.value),
                      })
                    }
                  />
                  <label className="admin-form-label">Width</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={selectedObject.width}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        width: Number(e.target.value),
                      })
                    }
                  />
                  <label className="admin-form-label">Height</label>
                  <input
                    type="number"
                    className="admin-input"
                    value={selectedObject.height}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        height: Number(e.target.value),
                      })
                    }
                  />
                  {/* Collidable checkbox - ONLY HERE */}
                  <label className="admin-form-label">Collidable</label>
                  <input
                    type="checkbox"
                    className="admin-checkbox"
                    checked={!!selectedObject.collidable}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        collidable: e.target.checked,
                      })
                    }
                  />
                  <label className="admin-form-label">
                    Draw order (zIndex)
                  </label>
                  <input
                    type="number"
                    className="admin-input"
                    value={selectedObject.zIndex ?? 0}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        zIndex: Number(e.target.value) || 0,
                      })
                    }
                    title="Lower = behind (e.g. bar back 0, tables 1, NPCs 2)"
                  />
                  <label className="admin-form-label">Hidden (until triggered)</label>
                  <input
                    type="checkbox"
                    className="admin-checkbox"
                    checked={!!selectedObject.hidden}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        hidden: e.target.checked,
                      })
                    }
                    title="If checked, this object won't appear until triggered by enemy death"
                  />
                  <label className="admin-form-label">Invisible (active)</label>
                  <input
                    type="checkbox"
                    className="admin-checkbox"
                    checked={selectedObject.color === "#00000000" || selectedObject.color === "transparent"}
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        color: e.target.checked ? "#00000000" : "#ffffff",
                      })
                    }
                    title="If checked, object is invisible but still collides/interacts (e.g. invisible wall or secret door)"
                  />
                  {selectedObject.type === "enemy" && (
                    <>
                      <label className="admin-form-label">Health</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={selectedObject.health ?? 100}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            health: Number(e.target.value),
                            maxHealth: Number(e.target.value),
                          })
                        }
                      />
                      <label className="admin-form-label">AI Type</label>
                      <select
                        className="admin-input"
                        value={selectedObject.aiType ?? "stationary"}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            aiType: e.target.value as
                              | "stationary"
                              | "patrol"
                              | "chase"
                              | "follow",
                          })
                        }
                      >
                        <option value="stationary">Stationary</option>
                        <option value="patrol">Patrol</option>
                        <option value="chase">Chase Player</option>
                        <option value="follow">Follow</option>
                      </select>
                      <label className="admin-form-label">Speed</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={selectedObject.speed ?? 2}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            speed: Number(e.target.value),
                          })
                        }
                      />
                      <label className="admin-form-label">Detection Range</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={selectedObject.detectionRange ?? 250}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            detectionRange: Number(e.target.value),
                          })
                        }
                      />
                      <label className="admin-form-label">Attack Range</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={selectedObject.attackRange ?? 40}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            attackRange: Number(e.target.value),
                          })
                        }
                      />
                      <label className="admin-form-label">Attack Damage</label>
                      <input
                        type="number"
                        className="admin-input"
                        value={selectedObject.attackDamage ?? 10}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            attackDamage: Number(e.target.value),
                          })
                        }
                      />
                      {(selectedObject.aiType === "patrol") && (
                        <>
                          <label className="admin-form-label admin-form-label-full">
                            Patrol Points (one per line: x,y)
                          </label>
                          <textarea
                            className="admin-textarea admin-input-full"
                            placeholder="600,100&#10;600,300&#10;400,300&#10;400,100"
                            value={
                              (selectedObject.patrolPoints || [])
                                .map((p: { x: number; y: number }) => `${p.x},${p.y}`)
                                .join("\n")
                            }
                            onChange={(e) => {
                              const lines = e.target.value.split("\n").filter(Boolean);
                              const points = lines.map((line) => {
                                const [x, y] = line.split(",").map((v) => Number(v.trim()) || 0);
                                return { x, y };
                              });
                              updateObject(selectedObject.id, {
                                patrolPoints: points,
                              });
                            }}
                          />
                        </>
                      )}
                      <label className="admin-form-label admin-form-label-full">
                        Drop Items on Death (select items)
                      </label>
                      <div
                        style={{
                          maxHeight: 120,
                          overflowY: "auto",
                          background: "var(--admin-bg-secondary, #1a1a1a)",
                          border: "1px solid var(--admin-border, #333)",
                          borderRadius: 4,
                          padding: 8,
                        }}
                      >
                        {config.objects
                          .filter((o) => o.type === "pickup" || o.type === "gun")
                          .map((o) => (
                            <label
                              key={o.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                marginBottom: 4,
                                fontSize: 12,
                                cursor: "pointer",
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={(selectedObject.dropItems || []).includes(o.id)}
                                onChange={(e) => {
                                  const current = selectedObject.dropItems || [];
                                  const updated = e.target.checked
                                    ? [...current, o.id]
                                    : current.filter((id: string) => id !== o.id);
                                  updateObject(selectedObject.id, {
                                    dropItems: updated,
                                  });
                                }}
                              />
                              {o.name || o.id} ({o.type})
                            </label>
                          ))}
                        {config.objects.filter((o) => o.type === "pickup" || o.type === "gun").length === 0 && (
                          <span style={{ color: "var(--admin-muted, #666)", fontSize: 11 }}>
                            No pickup/gun objects in this room
                          </span>
                        )}
                      </div>
                      <label className="admin-form-label admin-form-label-full">
                        On Death Trigger (object ID to activate)
                      </label>
                      <select
                        className="admin-input admin-input-full"
                        value={selectedObject.onDeathTrigger ?? ""}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            onDeathTrigger: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">— None —</option>
                        {config.objects
                          .filter((o) => o.id !== selectedObject.id)
                          .map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name || o.id} ({o.type})
                            </option>
                          ))}
                      </select>
                    </>
                  )}
                  {selectedObject.type === "floor" && (
                    <>
                      <label className="admin-form-label">Tile sprite</label>
                      <input
                        type="checkbox"
                        className="admin-checkbox"
                        checked={!!selectedObject.spriteRepeat}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            spriteRepeat: e.target.checked,
                          })
                        }
                        title="Repeat sprite to fill floor (e.g. wood planks)"
                      />
                    </>
                  )}
                  {selectedObject.type === "gun" && (
                    <>
                      <label className="admin-form-label">Item</label>
                      <select
                        className="admin-input"
                        value={selectedObject.itemId ?? ""}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            itemId: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">— Select item —</option>
                        {Object.values(ITEMS).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} ({item.id})
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {(selectedObject.type === "trigger" ||
                    selectedObject.type === "doorway" ||
                    selectedObject.triggerScene) && (
                    <>
                      <label className="admin-form-label">Link to room</label>
                      <select
                        className="admin-input"
                        value={selectedObject.triggerScene ?? ""}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            triggerScene:
                              (e.target.value as GameScene) || undefined,
                          })
                        }
                      >
                        <option value="">—</option>
                        {SCENE_KEYS.filter((k) => k !== sceneKey).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                  {selectedObject.type === "spawn_marker" && (
                    <>
                      <label className="admin-form-label">From Scene (triggers spawn)</label>
                      <select
                        className="admin-input"
                        value={selectedObject.fromScene ?? ""}
                        onChange={(e) =>
                          updateObject(selectedObject.id, {
                            fromScene: e.target.value || undefined,
                          })
                        }
                      >
                        <option value="">— Any / Default (use main spawn if empty) —</option>
                        {SCENE_KEYS.filter((k) => k !== sceneKey).map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </div>
                <label className="admin-form-label">
                  Dialogue lines (one per line)
                </label>
                <textarea
                  className="admin-textarea admin-textarea-dialogue"
                  value={(selectedObject.dialogue ?? []).join("\n")}
                  onChange={(e) =>
                    updateObject(selectedObject.id, {
                      dialogue: e.target.value.split("\n").filter(Boolean),
                    })
                  }
                />
                <div
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTop: "1px solid var(--admin-border, #333)",
                  }}
                >
                  <label className="admin-form-label">Pixel-art sprite</label>
                  {selectedObject.sprite ? (
                    <span style={{ fontSize: 12, color: "var(--admin-muted)" }}>
                      {selectedObject.sprite.w}×{selectedObject.sprite.h} pixels
                    </span>
                  ) : null}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 6,
                    }}
                  >
                    <button
                      type="button"
                      className="admin-btn"
                      onClick={() => {
                        const existing = selectedObject.sprite;
                        setEditingSprite(
                          existing
                            ? {
                                w: existing.w,
                                h: existing.h,
                                pixels: [...existing.pixels],
                              }
                            : createEmptySprite(16, 16),
                        );
                        setSpriteEditorOpen(true);
                      }}
                    >
                      {selectedObject.sprite ? "Edit sprite" : "Add sprite"}
                    </button>
                    {selectedObject.sprite && (
                      <button
                        type="button"
                        className="admin-btn"
                        style={{
                          background: "var(--admin-danger, #c0392b)",
                          color: "#fff",
                        }}
                        onClick={() =>
                          updateObject(selectedObject.id, { sprite: undefined })
                        }
                      >
                        Remove sprite
                      </button>
                    )}
                  </div>
                </div>
                {spriteEditorOpen && editingSprite && selectedObject && (
                  <div
                    className="admin-sprite-editor"
                    style={{
                      marginTop: 12,
                      padding: 12,
                      background: "var(--admin-bg-secondary, #1a1a1a)",
                      borderRadius: 8,
                      border: "1px solid var(--admin-border, #333)",
                    }}
                  >
                    <h4 style={{ margin: "0 0 8px 0", fontSize: 14 }}>
                      Pixel art editor
                    </h4>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div>
                        <label
                          style={{
                            fontSize: 11,
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Color
                        </label>
                        <input
                          type="color"
                          value={spritePaintColor}
                          onChange={(e) => setSpritePaintColor(e.target.value)}
                          style={{
                            width: 40,
                            height: 28,
                            padding: 0,
                            cursor: "pointer",
                          }}
                        />
                      </div>
                      <div>
                        <label
                          style={{
                            fontSize: 11,
                            display: "block",
                            marginBottom: 4,
                          }}
                        >
                          Grid size
                        </label>
                        <select
                          className="admin-input"
                          style={{ width: 90 }}
                          value={
                            [8, 16, 32, 64].includes(editingSprite.w) &&
                            editingSprite.w === editingSprite.h
                              ? `${editingSprite.w}x${editingSprite.h}`
                              : "custom"
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (v === "custom") return;
                            const [w, h] = v.split("x").map(Number);
                            setEditingSprite(createEmptySprite(w, h));
                          }}
                        >
                          <option value="8x8">8×8</option>
                          <option value="16x16">16×16</option>
                          <option value="32x32">32×32</option>
                          <option value="64x64">64×64</option>
                          {(editingSprite.w !== editingSprite.h ||
                            ![8, 16, 32, 64].includes(editingSprite.w)) && (
                            <option value="custom">
                              {editingSprite.w}×{editingSprite.h}
                            </option>
                          )}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() =>
                          setEditingSprite(
                            createEmptySprite(editingSprite.w, editingSprite.h),
                          )
                        }
                      >
                        Clear
                      </button>
                    </div>
                    <div
                      style={{
                        display: "inline-grid",
                        gridTemplateColumns: `repeat(${editingSprite.w}, 1fr)`,
                        gap: 0,
                        marginTop: 8,
                        border: "1px solid #444",
                        width: editingSprite.w * 14,
                        height: editingSprite.h * 14,
                      }}
                    >
                      {editingSprite.pixels.map((color, i) => (
                        <div
                          key={i}
                          role="button"
                          tabIndex={0}
                          style={{
                            width: 13,
                            height: 13,
                            backgroundColor: color || "transparent",
                            border: "1px solid #333",
                            cursor: "pointer",
                          }}
                          onClick={() => {
                            const next = [...editingSprite.pixels];
                            next[i] = spritePaintColor;
                            setEditingSprite({
                              ...editingSprite,
                              pixels: next,
                            });
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            const next = [...editingSprite.pixels];
                            next[i] = "";
                            setEditingSprite({
                              ...editingSprite,
                              pixels: next,
                            });
                          }}
                        />
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-save"
                        onClick={() => {
                          updateObject(selectedObject.id, {
                            sprite: editingSprite,
                          });
                          setSpriteEditorOpen(false);
                        }}
                      >
                        Apply
                      </button>
                      <button
                        type="button"
                        className="admin-btn"
                        onClick={() => {
                          setSpriteEditorOpen(false);
                          setEditingSprite(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <section className="admin-map-section">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <h2 className="admin-map-title" style={{ margin: 0 }}>
              Map preview
            </h2>
            <span style={{ fontSize: 12, color: "var(--admin-muted, #666)" }}>
              {drawFloorMode
                ? "Drag on the map to draw walkable floor (edges = walls)."
                : "Click and drag objects or spawn to move them."}
            </span>
            <button
              type="button"
              onClick={() => setDrawFloorMode((v) => !v)}
              className="cursor-pointer"
              style={{
                padding: "6px 12px",
                fontSize: 12,
                border: "1px solid var(--admin-border, #333)",
                borderRadius: 6,
                background: drawFloorMode
                  ? "var(--admin-accent, #3498db)"
                  : "var(--admin-bg-secondary, #2a2a2a)",
                color: drawFloorMode ? "#fff" : "var(--admin-fg, #ddd)",
              }}
              title="Draw walkable floor (Undertale-style: spawn must be inside floor; edges are walls)"
            >
              {drawFloorMode ? "Done drawing" : "Draw floor"}
            </button>
            <div
              role="group"
              aria-label="Map zoom"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                marginLeft: "auto",
              }}
            >
              <span style={{ fontSize: 12, color: "var(--admin-muted, #666)" }}>
                Zoom:
              </span>
              <button
                type="button"
                onClick={() => setMapZoom((z) => Math.max(0.25, z - 0.25))}
                className="cursor-pointer"
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  border: "1px solid var(--admin-border, #333)",
                  borderRadius: 4,
                  background: "var(--admin-bg-secondary, #2a2a2a)",
                  color: "var(--admin-fg, #ddd)",
                  fontSize: 16,
                  lineHeight: 1,
                }}
                title="Zoom out"
              >
                −
              </button>
              <button
                type="button"
                onClick={() => setMapZoom(1)}
                className="cursor-pointer"
                style={{
                  minWidth: 44,
                  height: 28,
                  padding: "0 6px",
                  border: "1px solid var(--admin-border, #333)",
                  borderRadius: 4,
                  background:
                    mapZoom === 1
                      ? "var(--admin-accent, #3498db)"
                      : "var(--admin-bg-secondary, #2a2a2a)",
                  color: "#fff",
                  fontSize: 12,
                }}
                title="Reset zoom to 100%"
              >
                {Math.round(mapZoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setMapZoom((z) => Math.min(3, z + 0.25))}
                className="cursor-pointer"
                style={{
                  width: 28,
                  height: 28,
                  padding: 0,
                  border: "1px solid var(--admin-border, #333)",
                  borderRadius: 4,
                  background: "var(--admin-bg-secondary, #2a2a2a)",
                  color: "var(--admin-fg, #ddd)",
                  fontSize: 16,
                  lineHeight: 1,
                }}
                title="Zoom in"
              >
                +
              </button>
            </div>
          </div>
          <div
            className="admin-map-zoom-wrapper"
            style={{
              overflow: "auto",
              maxHeight: "60vh",
              maxWidth: "100%",
              border: "1px solid var(--admin-border, #333)",
              borderRadius: 8,
            }}
            onWheel={(e) => {
              if (!e.ctrlKey && !e.metaKey) return;
              e.preventDefault();
              setMapZoom((z) =>
                Math.max(0.25, Math.min(3, z + (e.deltaY > 0 ? -0.1 : 0.1))),
              );
            }}
          >
            <div
              style={{
                width: roomWidth * scale * mapZoom,
                height: roomHeight * scale * mapZoom,
                position: "relative",
              }}
            >
              <div
                ref={roomRef}
                className="admin-map-canvas"
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  width: roomWidth * scale,
                  height: roomHeight * scale,
                  backgroundColor: config.bgColor,
                  backgroundImage: config.bgImage
                    ? `url(${config.bgImage})`
                    : undefined,
                  backgroundSize: config.bgImage ? "cover" : undefined,
                  transform: `scale(${mapZoom})`,
                  transformOrigin: "0 0",
                }}
              >
                {/* Draw-floor overlay: captures drag when draw mode is on (behind objects so empty area only) */}
                {drawFloorMode && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: roomWidth * scale,
                      height: roomHeight * scale,
                      zIndex: 0,
                      cursor: "crosshair",
                      pointerEvents: "auto",
                    }}
                    onMouseDown={(e) => {
                      if (drawFloorStart) return;
                      e.preventDefault();
                      e.stopPropagation();
                      const pos = getRoomCoords(e.nativeEvent);
                      setDrawFloorStart(pos);
                      setDrawFloorCurrent(pos);
                    }}
                    title="Drag to draw walkable floor"
                  />
                )}
                {/* Draw floor preview */}
                {drawFloorStart && drawFloorCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      left:
                        Math.min(drawFloorStart.x, drawFloorCurrent.x) * scale,
                      top:
                        Math.min(drawFloorStart.y, drawFloorCurrent.y) * scale,
                      width:
                        Math.max(
                          1,
                          Math.abs(drawFloorCurrent.x - drawFloorStart.x),
                        ) * scale,
                      height:
                        Math.max(
                          1,
                          Math.abs(drawFloorCurrent.y - drawFloorStart.y),
                        ) * scale,
                      backgroundColor: "rgba(74, 85, 104, 0.5)",
                      border: "2px dashed var(--admin-accent, #3498db)",
                      pointerEvents: "none",
                      zIndex: 5,
                    }}
                  />
                )}
                {/* Draw floor objects first, then all others on top */}
                {config.objects
                  .filter((obj) => obj.type === "floor")
                  .map((obj) => (
                    <div
                      key={obj.id}
                      className="admin-map-obj admin-map-floor"
                      style={{
                        left: obj.x * scale,
                        top: obj.y * scale,
                        width: obj.width * scale,
                        height: obj.height * scale,
                        backgroundColor: obj.color,
                        border: "2px dashed #636e72",
                        outline:
                          selectedId === obj.id
                            ? "2px solid var(--admin-accent)"
                            : "none",
                        opacity: 0.5,
                        position: "absolute",
                        zIndex: 2,
                      }}
                      onMouseDown={(e) => handleCanvasMouseDown(e, obj.id)}
                      title={obj.name || obj.id + " (floor) — walkable area"}
                    >
                      {/* Resize handles for floor */}
                      <div
                        className="resize-handle right"
                        style={{
                          position: "absolute",
                          right: -6,
                          top: "50%",
                          width: 12,
                          height: 16,
                          background: "#fff",
                          border: "1px solid #888",
                          borderRadius: 3,
                          cursor: "ew-resize",
                          transform: "translateY(-50%)",
                          zIndex: 2,
                        }}
                        onMouseDown={(e) =>
                          handleCanvasMouseDown(e, obj.id, false, "right")
                        }
                      />
                      <div
                        className="resize-handle bottom"
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: -6,
                          width: 16,
                          height: 12,
                          background: "#fff",
                          border: "1px solid #888",
                          borderRadius: 3,
                          cursor: "ns-resize",
                          transform: "translateX(-50%)",
                          zIndex: 2,
                        }}
                        onMouseDown={(e) =>
                          handleCanvasMouseDown(e, obj.id, false, "bottom")
                        }
                      />
                      <div
                        className="resize-handle corner"
                        style={{
                          position: "absolute",
                          right: -7,
                          bottom: -7,
                          width: 14,
                          height: 14,
                          background: "#fff",
                          border: "1px solid #888",
                          borderRadius: 3,
                          cursor: "nwse-resize",
                          zIndex: 2,
                        }}
                        onMouseDown={(e) =>
                          handleCanvasMouseDown(e, obj.id, false, "corner")
                        }
                      />
                    </div>
                  ))}
                {config.objects
                  .filter((obj) => obj.type !== "floor")
                  .map((obj) => (
                    <div
                      key={obj.id}
                      className="admin-map-obj"
                      style={{
                        left: obj.x * scale,
                        top: obj.y * scale,
                        width: obj.width * scale,
                        height: obj.height * scale,
                        backgroundColor: obj.color,
                        outline:
                          selectedId === obj.id
                            ? "2px solid var(--admin-accent)"
                            : "none",
                        position: "absolute",
                        zIndex: 2,
                      }}
                      onMouseDown={(e) => handleCanvasMouseDown(e, obj.id)}
                      title={obj.name || obj.id}
                    >
                      {/* Special rendering for spawn markers */}
                      {obj.type === "spawn_marker" && (
                        <div
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            background: "rgba(46, 204, 113, 0.5)",
                            border: "2px solid #2ecc71",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 10,
                            color: "#fff",
                            textShadow: "0 1px 2px #000",
                            overflow: "hidden",
                          }}
                        >
                          {obj.fromScene ? obj.fromScene.replace("_", " ") : "SPAWN"}
                        </div>
                      )}
                      
                      {/* Resize handles for all objects */}
                      <div
                        className="resize-handle right"
                        style={{
                          position: "absolute",
                          right: -6,
                          top: "50%",
                          width: 12,
                          height: 16,
                          background: "#fff",
                          border: "1px solid #888",
                          borderRadius: 3,
                          cursor: "ew-resize",
                          transform: "translateY(-50%)",
                          zIndex: 2,
                        }}
                        onMouseDown={(e) =>
                          handleCanvasMouseDown(e, obj.id, false, "right")
                        }
                      />
                      <div
                        className="resize-handle bottom"
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: -6,
                          width: 16,
                          height: 12,
                          background: "#fff",
                          border: "1px solid #888",
                          borderRadius: 3,
                          cursor: "ns-resize",
                          transform: "translateX(-50%)",
                          zIndex: 2,
                        }}
                        onMouseDown={(e) =>
                          handleCanvasMouseDown(e, obj.id, false, "bottom")
                        }
                      />
                      <div
                        className="resize-handle corner"
                        style={{
                          position: "absolute",
                          right: -7,
                          bottom: -7,
                          width: 14,
                          height: 14,
                          background: "#fff",
                          border: "1px solid #888",
                          borderRadius: 3,
                          cursor: "nwse-resize",
                          zIndex: 2,
                        }}
                        onMouseDown={(e) =>
                          handleCanvasMouseDown(e, obj.id, false, "corner")
                        }
                      />
                    </div>
                  ))}
                <div
                  className="admin-map-spawn"
                  style={{
                    position: "absolute",
                    left: config.spawnPoint.x * scale - 5,
                    top: config.spawnPoint.y * scale - 5,
                    cursor: "grab",
                    zIndex: 10,
                  }}
                  title="Spawn — drag to move"
                  onMouseDown={(e) => handleCanvasMouseDown(e, "spawn", true)}
                />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
