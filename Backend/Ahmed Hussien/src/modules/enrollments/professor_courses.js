const express = require('express');
const router = express.Router();
const { authenticateUser, requireRole } = require("../../middleware/auth.middleware");
const { getDashboard } = require("./professor.controller");

router.use(authenticateUser, requireRole("PROFESSOR"));

router.get('/dashboard', getDashboard);

module.exports = router;