const express = require('express');
const {
  createGroup,
  getGroups,
  triggerGroupAction,
  deleteGroup
} = require('../controllers/group.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['admin']), createGroup);
router.get('/', getGroups);
router.post('/:id/trigger', triggerGroupAction);
router.delete('/:id', roleMiddleware(['admin']), deleteGroup);

module.exports = router;
