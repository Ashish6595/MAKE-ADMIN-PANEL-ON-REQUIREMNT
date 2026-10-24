const express = require('express');
const { getEnergyReport, getAlerts, resolveAlert } = require('../controllers/energy.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// energy consumption reports
router.get('/report', getEnergyReport);

// malfunction alerts
router.get('/alerts', getAlerts);
router.patch('/alerts/:id/resolve', resolveAlert);

module.exports = router;
