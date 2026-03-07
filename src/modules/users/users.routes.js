const express = require("express");

const router = express.Router();

const {
    getUsers,
    getUser
} = require("./users.controller");

const {
    authenticateUser,
    requireRole
} = require("../../middleware/auth.middleware");

router.get(
    "/",
    authenticateUser,
    requireRole("ADMIN"),
    getUsers
);

router.get(
    "/:id",
    authenticateUser,
    getUser
);

module.exports = router;