export default function errorHandler(err, req, res, next) {
  // Jika error tidak punya statusCode → fallback 500
  const statusCode = err.statusCode || 500;

  // Log error di console (bisa ganti pakai logger util)
  if (process.env.NODE_ENV !== "test") {
    console.error("❌ Error:", err.message);
    if (err.stack) console.error(err.stack);
  }

  // Bentuk respons standar JSON
  res.status(statusCode).json({
    success: false,
    status: statusCode,
    message: err.message || "Internal Server Error",
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
  });
}