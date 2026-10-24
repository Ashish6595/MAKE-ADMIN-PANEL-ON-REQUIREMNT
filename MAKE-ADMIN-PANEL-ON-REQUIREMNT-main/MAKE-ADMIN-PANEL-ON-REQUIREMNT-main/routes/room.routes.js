const express = require('express');
const { createRoom, getRooms, deleteRoom } = require('../controllers/room.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

router.post('/', roleMiddleware(['admin']), createRoom);
router.get('/', getRooms);
router.delete('/:id', roleMiddleware(['admin']), deleteRoom);

module.exports = router;
