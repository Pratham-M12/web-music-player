const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const errorHandler = require("./middleware/errorHandler");

dotenv.config();

// ── Fail fast if critical env vars are missing ──
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET", "SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET"];
REQUIRED_ENV.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const app = express();

// ── Security: HTTP headers ──
app.use(helmet());

// ── Logging: HTTP request logs ──
app.use(morgan("dev"));

// ── Security: CORS — restrict to known origins ──
app.use(cors({
  origin: [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://127.0.0.1:5501',
    'http://localhost:5501',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true,
}));

app.use(express.json({ limit: "1mb" })); // Prevent oversized payloads

// ── Security: Rate limiting ──
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, error: 'Too many requests, please try again later.' },
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { success: false, error: 'Too many auth attempts, please try again later.' },
});

// ── Routes ──
const authRoutes = require("./routes/authRoutes");
const songRoutes = require("./routes/songRoutes");
const historyRoutes = require("./routes/historyRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const statsRoutes = require("./routes/statsRoutes");
const spotifyProxy = require("./routes/spotifyProxy");
const profileRoutes = require("./routes/profileRoutes");

app.use("/auth", authLimiter, authRoutes);
app.use("/songs", songRoutes);
app.use("/history", historyRoutes);
app.use("/playlists", playlistRoutes);
app.use("/stats", statsRoutes);
app.use("/spotify", spotifyProxy);
app.use("/profile", profileRoutes);

// ── Health check endpoint (no CORS restriction) ──
app.get("/health", (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = { 0: "disconnected", 1: "connected", 2: "connecting", 3: "disconnecting" };
  res.json({
    status: "ok",
    uptime: Math.floor(process.uptime()),
    database: states[dbState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (req, res) => {
  res.send("SONIX Backend Running");
});

// ── Centralized error handler (must be after routes) ──
app.use(errorHandler);

// ── Database connection ──
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });

// ── Start server ──
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

// ── Graceful shutdown ──
const shutdown = async (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(async () => {
    await mongoose.connection.close();
    console.log("✅ MongoDB disconnected. Goodbye!");
    process.exit(0);
  });
  // Force exit after 10s if graceful shutdown fails
  setTimeout(() => process.exit(1), 10000);
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
