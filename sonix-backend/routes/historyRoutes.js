const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Add song to recent history
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { spotifyUrl, title, artist, coverImage } = req.body;

    if (!spotifyUrl) {
      return res.status(400).json({ message: "spotifyUrl is required" });
    }

    const user = await User.findById(req.user.id);

    user.recentlyPlayed = user.recentlyPlayed.filter(
      (song) => song.spotifyUrl !== spotifyUrl
    );

    user.recentlyPlayed.unshift({
      spotifyUrl,
      title,
      artist,
      coverImage,
      playedAt: new Date(),
    });

    user.recentlyPlayed = user.recentlyPlayed.slice(0, 10);

    await user.save();

    res.json({ message: "Added to recently played", recentlyPlayed: user.recentlyPlayed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get recent history
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json(user.recentlyPlayed || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
