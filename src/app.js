const express = require("express");
const connectDB = require("./config/db");

const app = express();

// connect database
connectDB();

// middleware
app.use(express.json());

app.get("/", (req, res) => {
    res.send("API Running...");
});

module.exports = app;