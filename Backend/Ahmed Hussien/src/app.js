// src/app.js
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Routes
app.use("/api", routes);

// Health check
app.get("/", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "GeoAttend API is running",
        version: "1.0.0",
        endpoints: "/api/*"
    });
});

// 404 Handler
app.use("*", (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: `Route ${req.originalUrl} not found` 
    });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ 
        success: false, 
        error: "Internal server error",
        message: err.message 
    });
});

module.exports = app;