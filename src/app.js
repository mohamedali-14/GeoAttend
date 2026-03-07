const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const courseRoutes = require("./modules/courses/course.routes");
const scheduleRoutes = require("./modules/schedules/schedule.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("GeoAttend API Running...");
});

app.use("/auth", authRoutes);
app.use("/admin", adminRoutes);
app.use("/courses", courseRoutes);
app.use("/schedules", scheduleRoutes);

module.exports = app;