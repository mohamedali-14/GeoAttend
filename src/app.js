require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const routes = require("./routes");
const { startAllListeners } = require("./listeners/attendance.listener");

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175", "http://localhost:3000"],
    credentials: true,
}));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);

// Health check
app.get("/", (req, res) => res.json({ message: "GeoAttend API Running", status: "OK" }));
app.get("/health", (req, res) => res.json({ status: "OK", timestamp: new Date().toISOString() }));

// Start real-time listeners (only in production or development)
if (process.env.NODE_ENV !== 'test') {
    startAllListeners();
}

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
});

module.exports = app;