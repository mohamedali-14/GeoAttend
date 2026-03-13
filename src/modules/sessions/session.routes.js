const express = require('express');

const router = express.Router();

const {

    createSession,
    startSession,
    pauseSession,
    endSession

} = require('./session.controller');

router.post('/', createSession);

router.post('/:sessionId/start', startSession);

router.post('/:sessionId/pause', pauseSession);

router.post('/:sessionId/end', endSession);

module.exports = router;
