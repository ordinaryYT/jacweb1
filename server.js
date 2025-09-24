const express = require("express");
const path = require("path");
const app = express();

// Serve your single index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Optional: catch-all to redirect any unknown paths back to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// Render assigns PORT automatically
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Site running on port ${PORT}`);
});
