const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    await mongoose.connect("mongodb://127.0.0.1:27017/geo_attendance");
    console.log("MongoDB Connected ✅");
  } catch (error) {
    console.error("DB Error ❌", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
module.exports = connectDB;