// Quiz Sessions CRUD — used by frontend QuizContext for cross-device sync
const express = require('express');
const router  = express.Router();
const { authenticateUser } = require('../../middleware/auth.middleware');
const { db, admin }        = require('../../config/firebase');

router.use(authenticateUser);

const COL = 'quizSessions';

// GET /api/quiz/sessions  — all sessions (doctor sees own, student sees all)
router.get('/sessions', async (req, res) => {
  try {
    const snap = await db.collection(COL).orderBy('createdAt', 'desc').get();
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ success: true, sessions });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/quiz/sessions  — create
router.post('/sessions', async (req, res) => {
  try {
    const session = { ...req.body, createdAt: admin.firestore.FieldValue.serverTimestamp() };
    const id = req.body.id;
    if (id) {
      await db.collection(COL).doc(id).set(session, { merge: true });
      res.json({ success: true, id });
    } else {
      const ref = await db.collection(COL).add(session);
      res.json({ success: true, id: ref.id });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/quiz/sessions/:id  — update
router.put('/sessions/:id', async (req, res) => {
  try {
    await db.collection(COL).doc(req.params.id).set(
      { ...req.body, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/quiz/sessions/:id
router.delete('/sessions/:id', async (req, res) => {
  try {
    await db.collection(COL).doc(req.params.id).delete();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
