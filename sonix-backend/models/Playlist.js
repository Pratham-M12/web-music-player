const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    songs: [
      {
        spotifyUrl: String,
        title: String,
        artist: String,
        coverImage: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Playlist", playlistSchema);
