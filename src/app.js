const express = require("express");
const connectDB = require("./config/db");

const app = express();

// connect database
connectDB();

// middleware
app.use(express.json());

const cors = require("cors");
app.use(cors());

app.get("/", (req, res) => {
    res.send("API Running...");
});

module.exports = app;