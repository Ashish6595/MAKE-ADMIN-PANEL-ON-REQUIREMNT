const express = require('express');
const {
  activateEmergencyMode,
  deactivateEmergencyMode,
  processVoiceCommand,
  getUsagePrediction,
  getEnergyRecommendations
} = require('../controllers/smart.controller');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authMiddleware);

// emergency mode endpoints
router.post('/emergency/activate', activateEmergencyMode);
router.post('/emergency/deactivate', deactivateEmergencyMode);

// simulated voice command endpoint
router.post('/voice-command', processVoiceCommand);

// challenging ai simulation endpoints
router.get('/usage-prediction', getUsagePrediction);
router.get('/energy-recommendations', getEnergyRecommendations);

module.exports = router;
