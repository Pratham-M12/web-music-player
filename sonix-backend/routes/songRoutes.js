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

// Like by Spotify URI
router.put("/like-by-uri", async (req, res) => {
  try {
    const { spotifyUrl } = req.body;

    let song = await Song.findOne({ spotifyUrl });

    if (!song) {
      // create if not exists
      song = new Song({ spotifyUrl, likes: 1 });
    } else {
      song.likes = song.likes === 1 ? 0 : 1;
    }

    await song.save();

    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

const axios = require("axios");
const qs = require("querystring");

router.get("/import", async (req, res) => {
  try {
    // 1. Get access token
    const tokenRes = await axios.post(
      "https://accounts.spotify.com/api/token",
      qs.stringify({ grant_type: "client_credentials" }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization:
            "Basic " +
            Buffer.from(
              "c8d9585cebdc4077ad2b92de944c865b:5af5d05b0e63431bacbfc9372448c6fc"
            ).toString("base64"),
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    // 2. Fetch songs
    const songsRes = await axios.get(
      "https://api.spotify.com/v1/browse/new-releases",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const albums = songsRes.data.albums.items;

    const savedSongs = [];

    for (let album of albums) {
      const song = new Song({
        title: album.name,
        artist: album.artists[0].name,
        album: album.name,
        duration: "3:00",
        spotifyUrl: album.uri,   // 🔥 IMPORTANT
        coverImage: album.images[0].url,
      });

      await song.save();
      savedSongs.push(song);
    }

    res.json(savedSongs);
  } catch (err) {
    console.log(err.response?.data || err.message); // 🔥 IMPORTANT DEBUG
    res.status(500).json({ error: err.message });
  }
});

// Toggle Like
router.put("/:id/like", async (req, res) => {
  try {
    const song = await Song.findById(req.params.id);

    if (!song) {
      return res.status(404).json({ message: "Song not found" });
    }

    // toggle like
    song.likes = song.likes === 1 ? 0 : 1;

    await song.save();

    res.json(song);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});