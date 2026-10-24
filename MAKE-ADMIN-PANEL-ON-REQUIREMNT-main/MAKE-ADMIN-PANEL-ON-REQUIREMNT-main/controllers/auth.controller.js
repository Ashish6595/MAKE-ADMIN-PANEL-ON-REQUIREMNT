const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const Household = require('../models/Household.model');
const Room = require('../models/Room.model');

// POST /api/auth/register - register a new user and setup default household
const register = async (req, res) => {
  try {
    const { username, email, password, role, householdName } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    // check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // determine role: default to admin for primary account, or guest/child if specified
    const assignedRole = role && ['admin', 'guest', 'child'].includes(role) ? role : 'admin';

    // create new user
    const newUser = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole
    });

    await newUser.save();

    // auto-create household for the primary user
    const household = new Household({
      name: householdName || `${newUser.username}'s Household`,
      ownerId: newUser._id
    });
    await household.save();

    newUser.householdId = household._id;
    await newUser.save();

    // seed a couple of default rooms for convenience
    await Room.create([
      { name: 'Living Room', householdId: household._id, description: 'Main living space' },
      { name: 'Bedroom', householdId: household._id, description: 'Master bedroom' }
    ]);

    // generate jwt token
    const token = jwt.sign(
      { id: newUser._id, role: newUser.role, householdId: household._id },
      process.env.JWT_SECRET || 'smarthome_super_secret_jwt_key_2026',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered and household setup successfully',
      token,
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        householdId: household._id
      },
      household: {
        id: household._id,
        name: household.name
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
};

// POST /api/auth/login - user login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, householdId: user.householdId },
      process.env.JWT_SECRET || 'smarthome_super_secret_jwt_key_2026',
      { expiresIn: '7d' }
    );

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        householdId: user.householdId
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
};

// GET /api/auth/profile - current user profile & household info
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const household = await Household.findById(user.householdId);

    res.status(200).json({
      user,
      household
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching profile', error: error.message });
  }
};

// POST /api/auth/add-member - admin can add family members (Guest or Child)
const addHouseholdMember = async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' });
    }

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username }]
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const assignedRole = ['guest', 'child'].includes(role) ? role : 'guest';

    const newMember = new User({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: assignedRole,
      householdId: req.user.householdId
    });

    await newMember.save();

    res.status(201).json({
      message: `Household member added successfully with role '${assignedRole}'`,
      user: {
        id: newMember._id,
        username: newMember.username,
        email: newMember.email,
        role: newMember.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error adding member', error: error.message });
  }
};

module.exports = {
  register,
  login,
  getProfile,
  addHouseholdMember
};
