/**
 * Admin API server: writes room .ts files and syncs types/index.
 * Run: node scripts/admin-server.js
 * Requires: npm install express (dev)
 */

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ROOMS_DIR = path.join(PROJECT_ROOT, "rooms");

const app = express();
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});
app.use(express.json({ limit: "2mb" }));

function escapeStr(s) {
  if (s == null) return '""';
  return (
    '"' +
    String(s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n") +
    '"'
  );
}

function sceneKeyToPascal(sceneKey) {
  return sceneKey
    .split("_")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join("");
}

function sceneKeyToFileName(sceneKey) {
  return sceneKeyToPascal(sceneKey) + ".ts";
}

function formatObject(obj, sceneKey) {
  const parts = [
    `id: ${escapeStr(obj.id)}`,
    `x: ${obj.x}`,
    `y: ${obj.y}`,
    `width: ${obj.width}`,
    `height: ${obj.height}`,
    `color: ${escapeStr(obj.color)}`,
    `type: ${escapeStr(obj.type)}`,
  ];
  if (obj.name != null && obj.name !== "")
    parts.push(`name: ${escapeStr(obj.name)}`);
  if (obj.collidable === true) parts.push(`collidable: true`);
  if (
    obj.dialogue != null &&
    Array.isArray(obj.dialogue) &&
    obj.dialogue.length > 0
  ) {
    const lines = obj.dialogue.map((l) => "      " + escapeStr(l)).join(",\n");
    parts.push(`dialogue: [\n${lines},\n    ]`);
  }
  if ((obj.type === "trigger" || obj.triggerScene) && obj.triggerScene) {
    const key =
      typeof obj.triggerScene === "string"
        ? obj.triggerScene
        : obj.triggerScene;
    parts.push(`triggerScene: GameScene.${key}`);
  }
  return "    {\n      " + parts.join(",\n      ") + "\n    }";
}

function generateRoomTs(sceneKey, config) {
  const varName = sceneKey.toLowerCase();
  const lines = [];

  lines.push('import type { RoomConfig } from "../types";');
  lines.push('import { GameScene } from "../types";');
  lines.push("");

  // Special case: Tutorial room needs TUTORIAL_TARGET_IDS export
  if (sceneKey === "TUTORIAL") {
    const targetIds = config.objects
      .filter((obj) => obj.id.startsWith("target_"))
      .map((obj) => `"${obj.id}"`)
      .join(", ");
    lines.push(`export const TUTORIAL_TARGET_IDS = [${targetIds}];`);
    lines.push("");
  }

  lines.push(`export const ${varName}: RoomConfig = {`);
  lines.push(`  bgMusic: ${escapeStr(config.bgMusic)},`);
  lines.push(
    `  spawnPoint: { x: ${config.spawnPoint.x}, y: ${config.spawnPoint.y} },`,
  );
  lines.push(`  bgColor: ${escapeStr(config.bgColor)},`);
  lines.push(`  description: ${escapeStr(config.description)},`);
  if (config.width != null) lines.push(`  width: ${config.width},`);
  if (config.height != null) lines.push(`  height: ${config.height},`);
  if (
    config.onEnterDialogue &&
    config.onEnterDialogue.lines &&
    config.onEnterDialogue.lines.length > 0
  ) {
    lines.push("  onEnterDialogue: {");
    lines.push(`    speaker: ${escapeStr(config.onEnterDialogue.speaker)},`);
    lines.push("    lines: [");
    config.onEnterDialogue.lines.forEach((l) =>
      lines.push("      " + escapeStr(l) + ","),
    );
    lines.push("    ],");
    lines.push("  },");
  }
  lines.push("  objects: [");
  (config.objects || []).forEach((obj) => {
    lines.push(formatObject(obj, sceneKey) + ",");
  });
  lines.push("  ],");
  lines.push("};");

  return lines.join("\n") + "\n";
}

app.post("/api/save-room", (req, res) => {
  try {
    const { sceneKey, config } = req.body;
    if (!sceneKey || !config) {
      return res.status(400).json({ error: "sceneKey and config required" });
    }
    const fileName = sceneKeyToFileName(sceneKey);
    const filePath = path.join(ROOMS_DIR, fileName);
    const content = generateRoomTs(sceneKey, config);
    fs.writeFileSync(filePath, content, "utf8");
    res.json({ ok: true, file: fileName });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message) });
  }
});

function fileNameToSceneKey(fileName) {
  const base = path.basename(fileName, ".ts");
  if (base === "index") return null;
  const key = base
    .replace(/([A-Z])/g, "_$1")
    .toUpperCase()
    .replace(/^_/, "");
  return key;
}

app.delete("/api/delete-room", (req, res) => {
  try {
    const { sceneKey } = req.body;
    if (!sceneKey) {
      return res.status(400).json({ error: "sceneKey required" });
    }
    const fileName = sceneKeyToFileName(sceneKey);
    const filePath = path.join(ROOMS_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Room file not found" });
    }
    fs.unlinkSync(filePath);
    // Sync types and index after deletion
    try {
      const files = fs
        .readdirSync(ROOMS_DIR)
        .filter((f) => f.endsWith(".ts") && f !== "index.ts");
      const sceneKeys = files
        .map(fileNameToSceneKey)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      const typesPath = path.join(PROJECT_ROOT, "types.ts");
      let typesContent = fs.readFileSync(typesPath, "utf8");
      const enumMatch = typesContent.match(
        /export enum GameScene \{[\s\S]*?\n\}/,
      );
      if (enumMatch) {
        const enumBody = sceneKeys.map((k) => `  ${k} = "${k}",`).join("\n");
        const newEnum = "export enum GameScene {\n" + enumBody + "\n}";
        typesContent = typesContent.replace(
          /export enum GameScene \{[^}]+\}/,
          newEnum,
        );
        fs.writeFileSync(typesPath, typesContent, "utf8");
      }
      const indexPath = path.join(ROOMS_DIR, "index.ts");

      // Check if Tutorial.ts actually exports TUTORIAL_TARGET_IDS
      let hasTutorialTargetIds = false;
      const tutorialFile = files.find(
        (f) => path.basename(f, ".ts") === "Tutorial",
      );
      if (tutorialFile) {
        const tutorialPath = path.join(ROOMS_DIR, tutorialFile);
        const tutorialContent = fs.readFileSync(tutorialPath, "utf8");
        hasTutorialTargetIds = tutorialContent.includes(
          "export const TUTORIAL_TARGET_IDS",
        );
      }

      const imports = [
        'import type { RoomConfig } from "../types";',
        'import { GameScene } from "../types";',
        ...files.sort().map((f) => {
          const base = path.basename(f, ".ts");
          const pascal = sceneKeyToPascal(fileNameToSceneKey(f) || base);
          const extra =
            base === "Tutorial" && hasTutorialTargetIds
              ? ", TUTORIAL_TARGET_IDS"
              : "";
          return `import { ${pascal}Room${extra} } from "./${base}";`;
        }),
      ];
      const configEntries = sceneKeys
        .map((k) => `  [GameScene.${k}]: ${sceneKeyToPascal(k)}Room,`)
        .join("\n");
      const extraExports = hasTutorialTargetIds
        ? "\nexport { TUTORIAL_TARGET_IDS };"
        : "";
      const indexContent = [
        ...imports,
        "",
        "export { GameScene };",
        extraExports,
        "export type { RoomConfig };",
        "",
        "export const SCENE_CONFIGS: Record<GameScene, RoomConfig> = {",
        configEntries,
        "};",
        "",
      ].join("\n");
      fs.writeFileSync(indexPath, indexContent, "utf8");
    } catch (syncErr) {
      // If sync fails, still return success for deletion, but warn
      console.error("Sync after delete failed:", syncErr);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message) });
  }
});

app.post("/api/sync", (req, res) => {
  try {
    const files = fs
      .readdirSync(ROOMS_DIR)
      .filter((f) => f.endsWith(".ts") && f !== "index.ts");
    const sceneKeys = files
      .map(fileNameToSceneKey)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    const typesPath = path.join(PROJECT_ROOT, "types.ts");
    let typesContent = fs.readFileSync(typesPath, "utf8");
    const enumMatch = typesContent.match(
      /export enum GameScene \{[\s\S]*?\n\}/,
    );
    if (enumMatch) {
      const enumBody = sceneKeys.map((k) => `  ${k} = "${k}",`).join("\n");
      const newEnum = "export enum GameScene {\n" + enumBody + "\n}";
      typesContent = typesContent.replace(
        /export enum GameScene \{[^}]+\}/,
        newEnum,
      );
      fs.writeFileSync(typesPath, typesContent, "utf8");
    }

    const indexPath = path.join(ROOMS_DIR, "index.ts");

    // Check if Tutorial.ts actually exports TUTORIAL_TARGET_IDS
    let hasTutorialTargetIds = false;
    const tutorialFile = files.find(
      (f) => path.basename(f, ".ts") === "Tutorial",
    );
    if (tutorialFile) {
      const tutorialPath = path.join(ROOMS_DIR, tutorialFile);
      const tutorialContent = fs.readFileSync(tutorialPath, "utf8");
      hasTutorialTargetIds = tutorialContent.includes(
        "export const TUTORIAL_TARGET_IDS",
      );
    }

    const imports = [
      'import type { RoomConfig } from "../types";',
      'import { GameScene } from "../types";',
      ...files.sort().map((f) => {
        const base = path.basename(f, ".ts");
        const pascal = sceneKeyToPascal(fileNameToSceneKey(f) || base);
        const extra =
          base === "Tutorial" && hasTutorialTargetIds
            ? ", TUTORIAL_TARGET_IDS"
            : "";
        return `import { ${pascal}Room${extra} } from "./${base}";`;
      }),
    ];
    const configEntries = sceneKeys
      .map((k) => `  [GameScene.${k}]: ${sceneKeyToPascal(k)}Room,`)
      .join("\n");
    const extraExports = hasTutorialTargetIds
      ? "\nexport { TUTORIAL_TARGET_IDS };"
      : "";
    const indexContent = [
      ...imports,
      "",
      "export { GameScene };",
      extraExports,
      "export type { RoomConfig };",
      "",
      "export const SCENE_CONFIGS: Record<GameScene, RoomConfig> = {",
      configEntries,
      "};",
      "",
    ].join("\n");

    fs.writeFileSync(indexPath, indexContent, "utf8");
    res.json({ ok: true, sceneKeys });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err.message) });
  }
});

const PORT = 3001;

// Try to start server, use next port if in use
function startServer(port) {
  const server = app.listen(port, () => {
    console.log(`Admin API running at http://localhost:${port}`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`Port ${port} is in use, trying ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("Server error:", err);
      process.exit(1);
    }
  });

  return server;
}

const server = startServer(PORT);

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("\nSIGTERM received, closing server gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("\nSIGINT received (Ctrl+C), closing server gracefully...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

// Catch unhandled errors
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
  process.exit(1);
});
