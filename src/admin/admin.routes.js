const express = require("express");

const {
getAllUsers,
editUser,
deleteUser
} = require("./admin.controller");

const router = express.Router();

router.get("/users",getAllUsers);

router.put("/users/:userId",editUser);

router.delete("/users/:userId",deleteUser);

module.exports = router;