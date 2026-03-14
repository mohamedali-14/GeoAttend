const express = require("express");
const router = express.Router();
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");
const { getUsers, getUser } = require("./users.controller");

router.get("/", authenticateUser, requireRole("ADMIN"), getUsers);
router.get("/:id", authenticateUser, getUser);

module.exports = router;