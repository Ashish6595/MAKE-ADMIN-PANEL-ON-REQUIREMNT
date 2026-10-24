const express = require('express');
const { register, login, getProfile, addHouseholdMember } = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roleMiddleware = require('../middlewares/role.middleware');

const router = express.Router();

// public routes
router.post('/register', register);
router.post('/login', login);

// protected routes
router.get('/profile', authMiddleware, getProfile);
router.post('/add-member', authMiddleware, roleMiddleware(['admin']), addHouseholdMember);

module.exports = router;
