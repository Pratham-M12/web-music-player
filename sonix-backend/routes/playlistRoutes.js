const express = require("express");
const Playlist = require("../models/Playlist");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Create playlist
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;

    const playlist = await Playlist.create({
      name,
      user: req.user.id,
      songs: [],
    });

    res.status(201).json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get logged-in user's playlists
router.get("/", authMiddleware, async (req, res) => {
  try {
    const playlists = await Playlist.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(playlists);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add song to playlist
router.post("/:id/songs", authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user.id });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    playlist.songs.push(req.body);
    await playlist.save();

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove song from playlist by spotifyUrl
router.delete("/:id/songs", authMiddleware, async (req, res) => {
  try {
    const { spotifyUrl } = req.body;

    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user.id });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    playlist.songs = playlist.songs.filter((song) => song.spotifyUrl !== spotifyUrl);
    await playlist.save();

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rename playlist
router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name: req.body.name },
      { new: true }
    );

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json(playlist);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete playlist
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const playlist = await Playlist.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!playlist) {
      return res.status(404).json({ message: "Playlist not found" });
    }

    res.json({ message: "Playlist deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
