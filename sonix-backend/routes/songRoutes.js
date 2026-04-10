const express = require("express");
const axios = require("axios");
const qs = require("querystring");
const Song = require("../models/Song");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET all songs
router.get("/", async (req, res) => {
  try {
    const songs = await Song.find().sort({ createdAt: -1 });
    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SEARCH songs
router.get("/search", async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    const songs = await Song.find({
      $or: [
        { title: { $regex: q, $options: "i" } },
        { artist: { $regex: q, $options: "i" } },
        { album: { $regex: q, $options: "i" } },
      ],
    });

    res.json(songs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a song manually
router.post("/", async (req, res) => {
  try {
    const newSong = new Song(req.body);
    await newSong.save();
    res.status(201).json(newSong);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// TOGGLE like by spotify uri for logged-in user
router.put("/like-by-uri", authMiddleware, async (req, res) => {
  try {
    const { spotifyUrl, title, artist, album, coverImage } = req.body;

    if (!spotifyUrl) {
      return res.status(400).json({ message: "spotifyUrl is required" });
    }

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
      message: alreadyLiked ? "Song unliked" : "Song liked",
      liked: !alreadyLiked,
      song,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET liked songs of logged-in user
router.get("/liked", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("likedSongs");
    res.json(user.likedSongs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// IMPORT spotify new releases into DB
router.get("/import", async (req, res) => {
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

    res.json(savedSongs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
