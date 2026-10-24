const express = require('express');
const {
  createRoutine,
  getRoutines,
  executeRoutine,
  deleteRoutine
} = require('../controllers/routine.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['admin']), createRoutine);
router.get('/', getRoutines);
router.post('/:id/execute', executeRoutine);
router.delete('/:id', roleMiddleware(['admin']), deleteRoutine);

module.exports = router;
