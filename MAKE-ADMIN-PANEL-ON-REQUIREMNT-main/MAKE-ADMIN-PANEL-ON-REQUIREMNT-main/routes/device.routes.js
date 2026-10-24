const express = require('express');
const {
  createDevice,
  connectDevice,
  disconnectDevice,
  getDevices,
  getDeviceById,
  updateDeviceState,
  simulateMalfunction,
  resetMalfunction,
  deleteDevice
} = require('../controllers/device.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

router.use(authMiddleware);

// device CRUD & simulation routes
router.post('/', roleMiddleware(['admin']), createDevice);
router.get('/', getDevices);
router.get('/:id', getDeviceById);

// simulated connection & control
router.patch('/:id/connect', connectDevice);
router.patch('/:id/disconnect', disconnectDevice);
router.put('/:id/control', updateDeviceState);

// malfunction simulation & reset
router.post('/:id/simulate-malfunction', simulateMalfunction);
router.post('/:id/reset-malfunction', resetMalfunction);

// admin deletion
router.delete('/:id', roleMiddleware(['admin']), deleteDevice);

module.exports = router;
