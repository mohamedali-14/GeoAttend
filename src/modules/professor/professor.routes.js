const express = require('express');
const router = express.Router();

const {
    getDashboard
} = require('./professor.controller');

router.get('/dashboard', getDashboard);

module.exports = router;