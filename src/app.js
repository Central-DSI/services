import express from "express";
import cors from "cors";
import morgan from "morgan";
import { fileURLToPath, pathToFileURL } from "url";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import errorHandler from "./middlewares/error.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Swagger UI (serve OpenAPI spec at /docs)
try {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const openapiPath = path.join(__dirname, "docs", "openapi.yaml");
  const openapiSpec = YAML.load(openapiPath);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));
  console.log("📚 Swagger UI available at /docs");
} catch (err) {
  console.warn("⚠️ Swagger UI disabled — failed to load OpenAPI spec:", err.message);
}

// Auto register semua routes di /routes
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesPath = path.join(__dirname, "routes");

fs.readdirSync(routesPath).forEach(async (file) => {
  if (file.endsWith(".route.js")) {
    try {
      const routePath = path.join(routesPath, file);
      // On Windows, dynamic import requires a file:// URL, not a raw absolute path
      const routeUrl = pathToFileURL(routePath).href;
      const routeModule = await import(routeUrl);
      const routeName = file.replace(".route.js", "");
      app.use(`/${routeName}`, routeModule.default);
      console.log(`🧭 Loaded route: /${routeName}`);
    } catch (err) {
      console.error(`❌ Failed to load route file ${file}:`, err.message);
    }
  }
});

app.get("/", (req, res) => {
  res.json({ message: "API is running 🚀" });
});

app.use(errorHandler);

export default app;
