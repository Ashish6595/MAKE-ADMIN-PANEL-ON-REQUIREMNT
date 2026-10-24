const Routine = require('../models/Routine.model');
const Device = require('../models/Device.model');

// POST /api/routines - create a new routine schedule
const createRoutine = async (req, res) => {
  try {
    const { name, scheduledTime, repeatDays, actions } = req.body;

    if (!name || !actions || !Array.isArray(actions) || actions.length === 0) {
      return res.status(400).json({ message: 'Routine name and at least one action are required' });
    }

    const newRoutine = new Routine({
      name: name.trim(),
      householdId: req.user.householdId,
      scheduledTime: scheduledTime || '22:00',
      repeatDays: repeatDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      actions
    });

    await newRoutine.save();

    res.status(201).json({
      message: 'Routine schedule created successfully',
      routine: newRoutine
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating routine', error: error.message });
  }
};

// GET /api/routines - get all routines in household
const getRoutines = async (req, res) => {
  try {
    const routines = await Routine.find({ householdId: req.user.householdId })
      .populate('actions.deviceId', 'name deviceType powerState')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: routines.length,
      routines
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching routines', error: error.message });
  }
};

// POST /api/routines/:id/execute - trigger routine actions
const executeRoutine = async (req, res) => {
  try {
    const { id } = req.params;

    const routine = await Routine.findOne({ _id: id, householdId: req.user.householdId });
    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    const executedActions = [];

    for (const act of routine.actions) {
      const device = await Device.findOne({ _id: act.deviceId, householdId: req.user.householdId });
      if (device && device.connectionStatus === 'connected' && !device.isMalfunctioning) {
        device.powerState = act.targetPowerState;
        device.status = act.targetPowerState === 'on' ? 'On' : 'In Standby';

        if (act.targetSettings) {
          if (act.targetSettings.brightness !== undefined) device.features.brightness = act.targetSettings.brightness;
          if (act.targetSettings.temperature !== undefined) device.features.temperature = act.targetSettings.temperature;
          if (act.targetSettings.speed !== undefined) device.features.speed = act.targetSettings.speed;
        }

        await device.save();
        executedActions.push({
          deviceId: device._id,
          name: device.name,
          powerState: device.powerState
        });
      }
    }

    routine.lastExecuted = new Date();
    await routine.save();

    res.status(200).json({
      message: `Routine '${routine.name}' executed successfully`,
      executedCount: executedActions.length,
      actions: executedActions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error executing routine', error: error.message });
  }
};

// DELETE /api/routines/:id - delete a routine
const deleteRoutine = async (req, res) => {
  try {
    const { id } = req.params;

    const routine = await Routine.findOneAndDelete({ _id: id, householdId: req.user.householdId });
    if (!routine) {
      return res.status(404).json({ message: 'Routine not found' });
    }

    res.status(200).json({
      message: `Routine '${routine.name}' deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting routine', error: error.message });
  }
};

module.exports = {
  createRoutine,
  getRoutines,
  executeRoutine,
  deleteRoutine
};
