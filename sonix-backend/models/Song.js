const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
      maxlength: [200, "Title too long"],
    },
    artist: {
      type: String,
      default: "",
      trim: true,
      maxlength: [200, "Artist name too long"],
    },
    album: {
      type: String,
      default: "",
      trim: true,
    },
    duration: {
      type: String,
      default: "",
    },
    spotifyUrl: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },
    likes: {
      type: Number,
      default: 0,
      min: [0, "Likes cannot be negative"],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Song", songSchema);
