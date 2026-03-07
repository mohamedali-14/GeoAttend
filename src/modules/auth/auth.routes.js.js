const express = require("express");

const router = express.Router();

const { createUser } = require("./auth.controller");

const {
    authenticateUser,
    requireRole
} = require("../../middleware/auth.middleware");

router.post(
    "/create-user",
    authenticateUser,
    requireRole("ADMIN"),
    createUser
);

module.exports = router;