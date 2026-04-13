const express = require("express");
const axios = require("axios");
const qs = require("querystring");

const router = express.Router();

// Proxy: get a public Spotify token via Client Credentials
// This keeps the CLIENT_SECRET on the server only
router.get("/public-token", async (req, res) => {
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

    res.json({ access_token: tokenRes.data.access_token });
  } catch (err) {
    console.error("Spotify token proxy error:", err?.message);
    res.status(500).json({ error: "Failed to get Spotify token" });
  }
});

module.exports = router;
