const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const Song = require("../models/Song");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { likeByUriRules, validate } = require("../middleware/validators");

const router = express.Router();

// ── GET all songs ──
router.get("/", async (req, res, next) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: songs });
  } catch (err) {
    next(err);
  }
});

// ── SEARCH songs ──
router.get("/search", async (req, res, next) => {
  try {
    const { q } = req.query;

    if (!q || !q.trim()) {
      return res.json({ success: true, data: [] });
    }

    // Sanitize regex input to prevent ReDoS
    const sanitized = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const songs = await Song.find({
      $or: [
        { title: { $regex: sanitized, $options: "i" } },
        { artist: { $regex: sanitized, $options: "i" } },
        { album: { $regex: sanitized, $options: "i" } },
      ],
    }).limit(20);

    res.json({ success: true, data: songs });
  } catch (err) {
    next(err);
  }
});

// ── ADD a song manually (protected) ──
router.post("/", authMiddleware, async (req, res, next) => {
  try {
    const { title, artist, album, spotifyUrl } = req.body;
    const newSong = new Song({ title, artist, album, spotifyUrl });
    await newSong.save();
    res.status(201).json({ success: true, data: newSong });
  } catch (err) {
    next(err);
  }
});

// ── TOGGLE like by spotify URI (protected) ──
router.put("/like-by-uri", authMiddleware, likeByUriRules, validate, async (req, res, next) => {
  try {
    const { spotifyUrl, title, artist, album, coverImage } = req.body;

    let song = await Song.findOne({ spotifyUrl });

    if (!song) {
      song = await Song.create({
        spotifyUrl,
        title: title || "",
        artist: artist || "",
        album: album || "",
        coverImage: coverImage || "",
        likes: 0,
      });
    }

    const user = await User.findById(req.user.id);

    const alreadyLiked = user.likedSongs.some(
      (songId) => songId.toString() === song._id.toString()
    );

    if (alreadyLiked) {
      user.likedSongs = user.likedSongs.filter(
        (songId) => songId.toString() !== song._id.toString()
      );
      song.likes = Math.max(0, song.likes - 1);
    } else {
      user.likedSongs.push(song._id);
      song.likes += 1;
    }

    await user.save();
    await song.save();

    res.json({
      success: true,
      message: alreadyLiked ? "Song unliked" : "Song liked",
      liked: !alreadyLiked,
      data: song,
    });
  } catch (err) {
    next(err);
  }
});

// ── GET liked songs of logged-in user ──
router.get("/liked", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("likedSongs");
    res.json({ success: true, data: user.likedSongs });
  } catch (err) {
    next(err);
  }
});

// ── IMPORT Spotify new releases into DB (protected) ──
router.get("/import", authMiddleware, async (req, res, next) => {
  try {
    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
            ).toString("base64"),
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const songsRes = await axios.get(
      "https://api.spotify.com/v1/browse/new-releases?limit=10&country=IN",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const albums = songsRes.data.albums.items;
    const savedSongs = [];

    for (const album of albums) {
      const existing = await Song.findOne({ spotifyUrl: album.uri });
      if (existing) continue;

      const song = await Song.create({
        title: album.name,
        artist: album.artists?.[0]?.name || "",
        album: album.name,
        duration: "3:00",
        spotifyUrl: album.uri,
        coverImage: album.images?.[0]?.url || "",
      });

      savedSongs.push(song);
    }

    res.json({ success: true, imported: savedSongs.length, data: savedSongs });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
