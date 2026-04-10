const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const authRoutes = require("./routes/authRoutes");
const songRoutes = require("./routes/songRoutes");
const historyRoutes = require("./routes/historyRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const statsRoutes = require("./routes/statsRoutes");

app.use("/auth", authRoutes);
app.use("/songs", songRoutes);
app.use("/history", historyRoutes);
app.use("/playlists", playlistRoutes);
app.use("/stats", statsRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.get("/", (req, res) => {
  res.send("SONIX Backend Running");
});

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
