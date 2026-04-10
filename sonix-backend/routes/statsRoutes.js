const express = require("express");
const User = require("../models/User");
const Song = require("../models/Song");
const Playlist = require("../models/Playlist");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalSongs = await Song.countDocuments();
    const totalPlaylists = await Playlist.countDocuments();
    const mostLikedSongs = await Song.find().sort({ likes: -1 }).limit(5);

    res.json({
      totalUsers,
      totalSongs,
      totalPlaylists,
      mostLikedSongs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
