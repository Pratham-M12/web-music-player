const mongoose = require("mongoose");

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
    },
    artist: {
      type: String,
      default: "",
    },
    album: {
      type: String,
      default: "",
    },
    duration: {
      type: String,
      default: "",
    },
    spotifyUrl: {
      type: String,
      unique: true,
      sparse: true,
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
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Song", songSchema);
