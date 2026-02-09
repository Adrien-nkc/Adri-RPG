import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function copyDir(src: string, dest: string) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const name of fs.readdirSync(src)) {
    const s = path.join(src, name);
    const d = path.join(dest, name);
    if (fs.statSync(s).isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "serve-ost",
      configureServer(server) {
        server.middlewares.use("/OST", (req, res, next) => {
          const raw = (req.url ?? "/").replace(/^\//, "");
          const decoded = decodeURIComponent(raw);
          const file = path.join(process.cwd(), "OST", path.normalize(decoded).replace(/^(\.\.(\/|\\))+/, ""));
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            next();
            return;
          }
          res.setHeader("Content-Type", "audio/ogg");
          fs.createReadStream(file).pipe(res);
        });
      },
      writeBundle() {
        const ost = path.join(process.cwd(), "OST");
        if (fs.existsSync(ost)) {
          copyDir(ost, path.join(process.cwd(), "dist", "OST"));
        }
      },
    },
    {
      name: "serve-textures",
      configureServer(server) {
        server.middlewares.use("/Textures", (req, res, next) => {
          const raw = (req.url ?? "/").replace(/^\//, "");
          const decoded = decodeURIComponent(raw);
          const file = path.join(process.cwd(), "Textures", path.normalize(decoded).replace(/^(\.\.(\/|\\))+/, ""));
          if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
            next();
            return;
          }
          res.setHeader("Cache-Control", "public, max-age=3600");
          fs.createReadStream(file).pipe(res);
        });
      },
      writeBundle() {
        const textures = path.join(process.cwd(), "Textures");
        if (fs.existsSync(textures)) {
          copyDir(textures, path.join(process.cwd(), "dist", "Textures"));
        }
      },
    },
  ],
});
