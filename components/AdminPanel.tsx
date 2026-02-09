import React, { useState, useCallback, useRef, useEffect } from "react";
import type { RoomConfig, GameObject } from "../types";
import { GameScene } from "../types";
import { SCENE_CONFIGS } from "../rooms";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../constants";

const ADMIN_API = "http://localhost:3001";
const SCENE_KEYS = Object.keys(SCENE_CONFIGS) as GameScene[];

type RoomConfigEditable = RoomConfig & { width?: number; height?: number };

function cloneConfig(c: RoomConfig): RoomConfigEditable {
  return {
    ...c,
    spawnPoint: { ...c.spawnPoint },
    objects: c.objects.map((o) => ({
      ...o,
      dialogue: o.dialogue ? [...o.dialogue] : undefined,
      collidable: o.collidable ?? false,
    })),
    onEnterDialogue: c.onEnterDialogue
      ? {
          speaker: c.onEnterDialogue.speaker,
          lines: [...c.onEnterDialogue.lines],
        }
      : undefined,
    width: (c as RoomConfigEditable).width,
    height: (c as RoomConfigEditable).height,
  };
}

const OBJECT_TYPES: GameObject["type"][] = [
  "npc",
  "prop",
  "trigger",
  "save",
  "pickup",
  "doorway",
  "floor", // New type
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
  const roomRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  const roomWidth = config.width ?? CANVAS_WIDTH;
  const roomHeight = config.height ?? CANVAS_HEIGHT;
  const scale = Math.min(1, 600 / roomWidth, 400 / roomHeight);
  scaleRef.current = scale;

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
    if (c) setConfig(cloneConfig(c));
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
    try {
      const res = await fetch(`${ADMIN_API}/api/save-room`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sceneKey: key, config, exportName }),
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
    if (!drag) return;
    const onMove = (e: MouseEvent) => {
      const s = scaleRef.current || 1;
      const dx = (e.clientX - drag.startX) / s;
      const dy = (e.clientY - drag.startY) / s;
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
                    onChange={(e) =>
                      updateObject(selectedObject.id, {
                        type: e.target.value as GameObject["type"],
                      })
                    }
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
              </div>
            )}
          </section>
        </div>

        <section className="admin-map-section">
          <h2 className="admin-map-title">
            Map preview — click and drag objects to move them
          </h2>
          <div
            ref={roomRef}
            className="admin-map-canvas"
            style={{
              width: roomWidth * scale,
              height: roomHeight * scale,
              backgroundColor: config.bgColor,
            }}
          >
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
                  }}
                  onMouseDown={(e) => handleCanvasMouseDown(e, obj.id)}
                  title={obj.name || obj.id + " (floor)"}
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
                  }}
                  onMouseDown={(e) => handleCanvasMouseDown(e, obj.id)}
                  title={obj.name || obj.id}
                >
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
                left: config.spawnPoint.x * scale - 5,
                top: config.spawnPoint.y * scale - 5,
              }}
              title="Spawn"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
