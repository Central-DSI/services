import app from "./app.js";
import { ENV } from "./config/env.js";
import { initConnections } from "./config/db.js";

const PORT = ENV.PORT || 3000;

async function startServer() {
  try {
    await initConnections(); // ✅ pastikan DB & Redis ready
    app.listen(PORT, () => {
      console.log(`✅ Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1); // hentikan proses biar gak lanjut tanpa koneksi
  }
}

startServer();
