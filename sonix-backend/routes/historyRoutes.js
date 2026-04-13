const express = require("express");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const { body } = require("express-validator");
const { validate } = require("../middleware/validators");

const router = express.Router();

// ── Add song to recent history ──
router.post(
  "/",
  authMiddleware,
  [body("spotifyUrl").notEmpty().withMessage("spotifyUrl is required")],
  validate,
  async (req, res, next) => {
    try {
      const { spotifyUrl, title, artist, coverImage } = req.body;

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

      res.json({
        success: true,
        message: "Added to recently played",
        data: user.recentlyPlayed,
      });
    } catch (err) {
      next(err);
    }
  }
);

// ── Get recent history ──
router.get("/", authMiddleware, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, data: user.recentlyPlayed || [] });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
