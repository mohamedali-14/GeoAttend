const express = require("express");
const router = express.Router();

const { getAllUsers } = require("./admin.controller");
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");

router.get(
    "/users",
    authenticateUser,
    requireRole("ADMIN"),
    getAllUsers
);

module.exports = router;