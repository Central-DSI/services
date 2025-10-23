import express from "express";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Resolve __filename/__dirname once
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Swagger UI (serve OpenAPI spec at /docs)
try {
  const docsDir = path.join(__dirname, "docs");
  // Serve the raw YAML and referenced fragments so the browser can resolve $ref URLs
  app.use("/docs", express.static(docsDir));
  // Configure Swagger UI to fetch the YAML by URL, enabling client-side $ref resolution
  app.use(
    "/docs",
    swaggerUi.serve,
    swaggerUi.setup(null, { swaggerOptions: { url: "/docs/openapi.yaml" } })
  );
  console.log("📚 Swagger UI available at /docs");
} catch (err) {
  console.warn("⚠️ Swagger UI disabled — failed to initialize Swagger UI:", err.message);
}

// Auto register semua routes di /routes
const routesPath = path.join(__dirname, "routes");

try {
  const routeFiles = fs
    .readdirSync(routesPath)
    .filter((f) => f.endsWith(".route.js"));
  const mounted = [];
  for (const file of routeFiles) {
    try {
      const routePath = path.join(routesPath, file);
      const routeUrl = pathToFileURL(routePath).href; // needed on Windows
      const routeModule = await import(routeUrl);
      const routeName = file.replace(".route.js", "");
      if (!routeModule?.default) {
        console.warn(`⚠️ Route file ${file} has no default export, skipping`);
        continue;
      }
      app.use(`/${routeName}`, routeModule.default);
      mounted.push(`/${routeName}`);
      console.log(`🧭 Loaded route: /${routeName}`);
    } catch (err) {
      console.error(`❌ Failed to load route file ${file}:`, err.stack || err.message);
    }
  }
  console.log(`🧩 Routes mounted (${mounted.length}): ${mounted.join(", ") || "(none)"}`);
} catch (e) {
  console.error("❌ Failed scanning routes directory:", e.stack || e.message);
}

app.get("/", (req, res) => {
  res.json({ message: "API is running 🚀" });
});

// 404 logger → forward to error handler as JSON
app.use((req, res, next) => {
  const msg = `Route not found: ${req.method} ${req.originalUrl}`;
  console.warn(`🛑 404 → ${msg}`);
  const err = new Error(msg);
  err.statusCode = 404;
  next(err);
});

app.use(errorHandler);

export default app;
