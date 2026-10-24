const Device = require('../models/Device.model');
const Room = require('../models/Room.model');
const Alert = require('../models/Alert.model');
const EnergyLog = require('../models/EnergyLog.model');

// default wattage by device type for realistic simulated energy tracking
const DEFAULT_WATTS = {
  lamp: 15,
  fan: 75,
  thermostat: 25,
  ac: 1500,
  heater: 2000,
  door: 10,
  coffeemaker: 800,
  tv: 120,
  general: 60
};

// POST /api/devices - create a simulated smart device
const createDevice = async (req, res) => {
  try {
    const { name, deviceType, roomId, features, wattage } = req.body;

    if (!name || !deviceType || !roomId) {
      return res.status(400).json({ message: 'Device name, deviceType, and roomId are required' });
    }

    // verify room belongs to current household
    const room = await Room.findOne({ _id: roomId, householdId: req.user.householdId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found in this household' });
    }

    const ratedWattage = wattage || DEFAULT_WATTS[deviceType.toLowerCase()] || 60;

    // merge default features based on device type
    const initialFeatures = {
      brightness: features?.brightness ?? 100,
      colorMode: features?.colorMode ?? 'Warm',
      speed: features?.speed ?? 'Medium',
      temperature: features?.temperature ?? 24,
      minTemp: features?.minTemp ?? 18,
      maxTemp: features?.maxTemp ?? 30,
      mode: features?.mode ?? 'Cool',
      isLocked: features?.isLocked ?? true
    };

    const newDevice = new Device({
      name: name.trim(),
      deviceType: deviceType.toLowerCase(),
      roomId,
      householdId: req.user.householdId,
      connectionStatus: 'disconnected', // starts disconnected as per L2 specs
      powerState: 'off',
      status: 'Disconnected',
      wattage: ratedWattage,
      features: initialFeatures
    });

    await newDevice.save();

    res.status(201).json({
      message: 'Simulated device created successfully. Click "Connect" to link it with the dashboard.',
      device: newDevice
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating device', error: error.message });
  }
};

// PATCH /api/devices/:id/connect - simulate linking device to smart home network
const connectDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({ _id: id, householdId: req.user.householdId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.connectionStatus = 'connected';
    device.status = device.powerState === 'on' ? 'On' : 'In Standby';
    await device.save();

    res.status(200).json({
      message: `Device '${device.name}' connected successfully! Ready for dashboard control.`,
      device
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error connecting device', error: error.message });
  }
};

// PATCH /api/devices/:id/disconnect - simulate disconnecting device
const disconnectDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({ _id: id, householdId: req.user.householdId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.connectionStatus = 'disconnected';
    device.powerState = 'off';
    device.status = 'Disconnected';
    await device.save();

    res.status(200).json({
      message: `Device '${device.name}' disconnected.`,
      device
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error disconnecting device', error: error.message });
  }
};

// GET /api/devices - get all devices in household
const getDevices = async (req, res) => {
  try {
    const filter = { householdId: req.user.householdId };
    if (req.query.roomId) {
      filter.roomId = req.query.roomId;
    }
    if (req.query.deviceType) {
      filter.deviceType = req.query.deviceType;
    }

    const devices = await Device.find(filter)
      .populate('roomId', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      count: devices.length,
      devices
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching devices', error: error.message });
  }
};

// GET /api/devices/:id - get single device
const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, householdId: req.user.householdId })
      .populate('roomId', 'name');

    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    res.status(200).json({ device });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching device', error: error.message });
  }
};

// PUT /api/devices/:id/control - control device state and features
const updateDeviceState = async (req, res) => {
  try {
    const { id } = req.params;
    const { powerState, features, simulateRunHours } = req.body;

    const device = await Device.findOne({ _id: id, householdId: req.user.householdId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // business rule: device must be connected first
    if (device.connectionStatus === 'disconnected') {
      return res.status(400).json({
        message: `Device '${device.name}' is disconnected. Please click 'Connect' to link it first.`
      });
    }

    // business rule: malfunctioning device cannot be controlled until reset
    if (device.isMalfunctioning) {
      return res.status(400).json({
        message: `Device '${device.name}' is malfunctioning (${device.malfunctionReason}). Please reset it before operating.`
      });
    }

    // RBAC check: Child role restrictions
    if (req.user.role === 'child') {
      if (['heater', 'door'].includes(device.deviceType)) {
        return res.status(403).json({
          message: `Access denied: Child role cannot operate hazardous devices (${device.deviceType})`
        });
      }
    }

    // update power state and energy metrics
    if (powerState && ['on', 'off'].includes(powerState)) {
      if (powerState === 'on' && device.powerState !== 'on') {
        device.powerState = 'on';
        device.status = 'On';
        device.lastTurnedOn = new Date();
      } else if (powerState === 'off' && device.powerState === 'on') {
        device.powerState = 'off';
        device.status = 'In Standby';

        // calculate run hours (or accept simulated hours for testing/demo)
        let hoursUsed = simulateRunHours || 1; // default simulated 1 hr of usage if turned off
        if (device.lastTurnedOn) {
          const diffMs = Date.now() - new Date(device.lastTurnedOn).getTime();
          const actualHours = diffMs / (1000 * 60 * 60);
          if (actualHours > 0.05) {
            hoursUsed = actualHours;
          }
        }

        device.totalRunHours += hoursUsed;

        // log energy consumption: (wattage * hours) / 1000 = kWh
        const energyKWh = Number(((device.wattage * hoursUsed) / 1000).toFixed(2));
        await EnergyLog.create({
          householdId: req.user.householdId,
          deviceId: device._id,
          hoursUsed: Number(hoursUsed.toFixed(2)),
          energyConsumedKWh: energyKWh
        });
      }
    }

    // update configurable features (brightness, speed, temperature, etc.)
    if (features) {
      if (features.brightness !== undefined) {
        device.features.brightness = Math.min(100, Math.max(0, Number(features.brightness)));
      }
      if (features.colorMode) {
        device.features.colorMode = features.colorMode;
      }
      if (features.speed) {
        device.features.speed = features.speed;
      }
      if (features.temperature !== undefined) {
        // validate temperature limits
        const targetTemp = Number(features.temperature);
        if (targetTemp < device.features.minTemp || targetTemp > device.features.maxTemp) {
          return res.status(400).json({
            message: `Temperature must be between ${device.features.minTemp}°C and ${device.features.maxTemp}°C`
          });
        }
        device.features.temperature = targetTemp;
      }
      if (features.mode) {
        device.features.mode = features.mode;
      }
      if (features.isLocked !== undefined) {
        device.features.isLocked = Boolean(features.isLocked);
      }
    }

    // abnormal usage check: if heater runs for more than 24 hours, auto trigger malfunction alert
    if (device.deviceType === 'heater' && device.totalRunHours >= 24) {
      device.isMalfunctioning = true;
      device.status = 'Malfunctioning';
      device.malfunctionReason = 'Heater remained on continuously for over 24 hours. Automatic safety shutdown triggered.';
      await Alert.create({
        householdId: req.user.householdId,
        deviceId: device._id,
        type: 'malfunction',
        severity: 'high',
        message: `Warning: ${device.name} has abnormal continuous usage (>24h). Safety reset required.`
      });
    }

    await device.save();

    res.status(200).json({
      message: `Device '${device.name}' state updated successfully`,
      device
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating device', error: error.message });
  }
};

// POST /api/devices/:id/simulate-malfunction - simulate device failure
const simulateMalfunction = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const device = await Device.findOne({ _id: id, householdId: req.user.householdId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    const malfunctionMsg = reason || `Abnormal behavior detected on ${device.name}. Device unresponsive.`;

    device.isMalfunctioning = true;
    device.status = 'Malfunctioning';
    device.malfunctionReason = malfunctionMsg;
    await device.save();

    const alert = await Alert.create({
      householdId: req.user.householdId,
      deviceId: device._id,
      type: 'malfunction',
      severity: 'high',
      message: malfunctionMsg
    });

    res.status(200).json({
      message: `Malfunction simulated on '${device.name}'`,
      device,
      alert
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error simulating malfunction', error: error.message });
  }
};

// POST /api/devices/:id/reset-malfunction - reset malfunctioning device
const resetMalfunction = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOne({ _id: id, householdId: req.user.householdId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    device.isMalfunctioning = false;
    device.status = device.connectionStatus === 'connected' ? (device.powerState === 'on' ? 'On' : 'In Standby') : 'Disconnected';
    device.malfunctionReason = null;
    await device.save();

    // mark alerts resolved
    await Alert.updateMany({ deviceId: id, isResolved: false }, { isResolved: true });

    res.status(200).json({
      message: `Device '${device.name}' reset successfully and returned to normal status`,
      device
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error resetting device', error: error.message });
  }
};

// DELETE /api/devices/:id - admin deletes a device
const deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    const device = await Device.findOneAndDelete({ _id: id, householdId: req.user.householdId });
    if (!device) {
      return res.status(404).json({ message: 'Device not found' });
    }

    // clean up associated alerts & energy logs
    await Alert.deleteMany({ deviceId: id });
    await EnergyLog.deleteMany({ deviceId: id });

    res.status(200).json({
      message: `Device '${device.name}' deleted successfully`
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting device', error: error.message });
  }
};

module.exports = {
  createDevice,
  connectDevice,
  disconnectDevice,
  getDevices,
  getDeviceById,
  updateDeviceState,
  simulateMalfunction,
  resetMalfunction,
  deleteDevice
};
