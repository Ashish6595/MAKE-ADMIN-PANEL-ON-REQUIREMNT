const DeviceGroup = require('../models/DeviceGroup.model');
const Device = require('../models/Device.model');

// POST /api/groups - create device group
const createGroup = async (req, res) => {
  try {
    const { name, deviceIds } = req.body;

    if (!name || !deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
      return res.status(400).json({ message: 'Group name and at least one device ID are required' });
    }

    const group = new DeviceGroup({
      name: name.trim(),
      householdId: req.user.householdId,
      deviceIds
    });

    await group.save();

    res.status(201).json({
      message: 'Device group created successfully',
      group
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating device group', error: error.message });
  }
};

// GET /api/groups - get all device groups
const getGroups = async (req, res) => {
  try {
    const groups = await DeviceGroup.find({ householdId: req.user.householdId })
      .populate('deviceIds', 'name deviceType powerState status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: groups.length,
      groups
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching groups', error: error.message });
  }
};

// POST /api/groups/:id/trigger - collective action on group devices
const triggerGroupAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { powerState } = req.body; // 'on' or 'off'

    const group = await DeviceGroup.findOne({ _id: id, householdId: req.user.householdId });
    if (!group) {
      return res.status(404).json({ message: 'Device group not found' });
    }

    const targetPower = ['on', 'off'].includes(powerState) ? powerState : 'on';

    // update all connected devices in group
    const updatedDevices = [];
    for (const devId of group.deviceIds) {
      const device = await Device.findOne({ _id: devId, householdId: req.user.householdId });
      if (device && device.connectionStatus === 'connected' && !device.isMalfunctioning) {
        device.powerState = targetPower;
        device.status = targetPower === 'on' ? 'On' : 'In Standby';
        await device.save();
        updatedDevices.push({ id: device._id, name: device.name, powerState: targetPower });
      }
    }

    res.status(200).json({
      message: `Group '${group.name}' activated: turned ${targetPower.toUpperCase()} for ${updatedDevices.length} devices`,
      affectedDevices: updatedDevices
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error triggering group action', error: error.message });
  }
};

// DELETE /api/groups/:id - delete a group
const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await DeviceGroup.findOneAndDelete({ _id: id, householdId: req.user.householdId });
    if (!group) {
      return res.status(404).json({ message: 'Device group not found' });
    }

    res.status(200).json({
      message: `Device group '${group.name}' deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting group', error: error.message });
  }
};

module.exports = {
  createGroup,
  getGroups,
  triggerGroupAction,
  deleteGroup
};
