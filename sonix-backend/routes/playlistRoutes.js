const express = require("express");
const Playlist = require("../models/Playlist");
const authMiddleware = require("../middleware/authMiddleware");
const { createPlaylistRules, addSongRules, objectIdParam, validate } = require("../middleware/validators");

const router = express.Router();

// ── Create playlist ──
router.post("/", authMiddleware, createPlaylistRules, validate, async (req, res, next) => {
  try {
    const playlist = await Playlist.create({
      name: req.body.name,
      user: req.user.id,
      songs: [],
    });

    res.status(201).json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
});

// ── Get logged-in user's playlists ──
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const playlists = await Playlist.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json({ success: true, data: playlists });
  } catch (err) {
    next(err);
  }
});

// ── Add song to playlist ──
router.post("/:id/songs", authMiddleware, objectIdParam("id"), addSongRules, validate, async (req, res, next) => {
  try {
    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user.id });

    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    const { spotifyUrl, title, artist, coverImage } = req.body;
    playlist.songs.push({ spotifyUrl, title, artist, coverImage });
    await playlist.save();

    res.json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
});

// ── Remove song from playlist by spotifyUrl ──
router.delete("/:id/songs", authMiddleware, objectIdParam("id"), addSongRules, validate, async (req, res, next) => {
  try {
    const { spotifyUrl } = req.body;

    const playlist = await Playlist.findOne({ _id: req.params.id, user: req.user.id });

    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    playlist.songs = playlist.songs.filter((song) => song.spotifyUrl !== spotifyUrl);
    await playlist.save();

    res.json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
});

// ── Rename playlist ──
router.put("/:id", authMiddleware, objectIdParam("id"), createPlaylistRules, validate, async (req, res, next) => {
  try {
    const playlist = await Playlist.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { name: req.body.name },
      { new: true, runValidators: true }
    );

    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    res.json({ success: true, data: playlist });
  } catch (err) {
    next(err);
  }
});

// ── Delete playlist ──
router.delete("/:id", authMiddleware, objectIdParam("id"), validate, async (req, res, next) => {
  try {
    const playlist = await Playlist.findOneAndDelete({
      _id: req.params.id,
      user: req.user.id,
    });

    if (!playlist) {
      return res.status(404).json({ success: false, error: "Playlist not found" });
    }

    res.json({ success: true, message: "Playlist deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
