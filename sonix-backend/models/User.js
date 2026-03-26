const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  likedSongs: [{ type: mongoose.Schema.Types.ObjectId, ref: "Song" }]
});

module.exports = mongoose.model("User", userSchema);