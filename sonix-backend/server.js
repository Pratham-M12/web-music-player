const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const songRoutes = require("./routes/songRoutes");
app.use("/songs", songRoutes);

// DB Connection
mongoose.connect("mongodb://127.0.0.1:27017/sonix")
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.get("/", (req, res) => {
  res.send("SONIX Backend Running 🎵");
});

app.listen(5000, () => console.log("Server running on port 5000"));