const mongoose = require("mongoose");

const songSchema = new mongoose.Schema({
  title: String,
  artist: String,
  album: String,
  duration: String,
  fileUrl: String,
  coverImage: String,
  likes: {
  type: Number,
  default: 0
}
});

module.exports = mongoose.model("Song", songSchema);
