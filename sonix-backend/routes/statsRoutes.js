const express = require("express");
const User = require("../models/User");
const Song = require("../models/Song");
const Playlist = require("../models/Playlist");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// ── Get platform stats (protected — don't expose counts to the public) ──
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const [totalUsers, totalSongs, totalPlaylists, mostLikedSongs] = await Promise.all([
      User.countDocuments(),
      Song.countDocuments(),
      Playlist.countDocuments(),
      Song.find().sort({ likes: -1 }).limit(5).select("title artist likes coverImage"),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSongs,
        totalPlaylists,
        mostLikedSongs,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
