require("dotenv").config();
const express    = require("express");
const bodyParser = require("body-parser");
const cors       = require("cors");
const routes     = require("./routes");
const authRoutes = require("./modules/auth/auth.routes.js");

const app = express();

// CORS - السماح للفرونت يكلم الباك
app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
  credentials: true,
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use("/api", routes);
app.use("/api/auth", authRoutes);

// Health check
app.get("/", (req, res) => res.json({ message: "GeoAttend API Running" }));

// 404
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
