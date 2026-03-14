const express = require("express");
const router = express.Router();
const { authenticateUser, requireRole } = require("../middleware/auth.middleware");
const { getAllUsers, editUser, deleteUser } = require("./admin.controller");

router.use(authenticateUser, requireRole("ADMIN"));

router.get("/users", getAllUsers);
router.put("/users/:userId", editUser);
router.delete("/users/:userId", deleteUser);

module.exports = router;