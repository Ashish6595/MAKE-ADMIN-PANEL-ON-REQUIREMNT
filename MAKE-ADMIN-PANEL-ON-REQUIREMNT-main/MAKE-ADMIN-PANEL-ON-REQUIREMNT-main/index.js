const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const connectDB = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const roomRoutes = require('./routes/room.routes');
const deviceRoutes = require('./routes/device.routes');
const routineRoutes = require('./routes/routine.routes');
const groupRoutes = require('./routes/group.routes');
const smartRoutes = require('./routes/smart.routes');
const energyRoutes = require('./routes/energy.routes');

const app = express();
const PORT = process.env.PORT || 5000;

// standard middlewares
app.use(cors());
app.use(express.json());

// serve frontend dashboard static assets
app.use(express.static(path.join(__dirname, 'public')));

// health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', project: 'SmartHome_Manager', timestamp: new Date() });
});

// mount API routes under /api
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/routines', routineRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/smart', smartRoutes);
app.use('/api/energy', energyRoutes);

// also mount routes without /api prefix for test-suite flexibility
app.use('/auth', authRoutes);
app.use('/rooms', roomRoutes);
app.use('/devices', deviceRoutes);
app.use('/routines', routineRoutes);
app.use('/groups', groupRoutes);
app.use('/smart', smartRoutes);
app.use('/energy', energyRoutes);

// fall back to index.html for single-page app
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path.startsWith('/devices')) {
    return next();
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// start server after database connection
const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`SmartHome_Manager server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to view the interactive dashboard`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = app;
