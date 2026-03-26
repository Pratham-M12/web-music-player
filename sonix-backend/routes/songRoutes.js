const express = require("express");
const router = express.Router();
const Song = require("../models/Song");

// GET all songs
router.get("/", async (req, res) => {
  try {
    const songs = await Song.find();
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a song (for testing)
router.post("/", async (req, res) => {
  try {
    const newSong = new Song(req.body);
    await newSong.save();
    res.json(newSong);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;