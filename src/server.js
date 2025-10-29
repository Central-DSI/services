import app from "./app.js";
import { initWebSocket } from "./config/ws.js";
import { ENV } from "./config/env.js";
import { initConnections } from "./config/db.js";
import { scheduleDailyThesisStatus } from "./queues/maintenance.queue.js";
// removed password queue worker; using user-initiated account activation instead

const PORT = ENV.PORT || 3000;

async function startServer() {
  try {
    await initConnections(); // ✅ pastikan DB & Redis ready
    // Schedule daily maintenance jobs
    await scheduleDailyThesisStatus();
    const server = app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
    // Mount WebSocket on the same HTTP server
    initWebSocket(server);
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1); // hentikan proses biar gak lanjut tanpa koneksi
  }
}

startServer();
