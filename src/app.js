const express = require("express");
const connectDB = require("./config/db");
const cors = require("cors");

// إنشاء التطبيق
const app = express();

// اتصال بقاعدة البيانات
connectDB();  // لازم يكون فيه console.log("MongoDB Connected") في connectDB

// Middleware
app.use(express.json());
app.use(cors());

// Routes
app.use("/api/auth", require("./routes/auth"));

// Test route
app.get("/", (req, res) => res.send("API Running..."));

// تشغيل السيرفر مباشرة من app.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;