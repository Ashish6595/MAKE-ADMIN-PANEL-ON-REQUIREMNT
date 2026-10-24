const Household = require('../models/Household.model');
const Device = require('../models/Device.model');
const Alert = require('../models/Alert.model');
const Routine = require('../models/Routine.model');
const EnergyLog = require('../models/EnergyLog.model');

// POST /api/smart/emergency/activate - emergency mode simulation
const activateEmergencyMode = async (req, res) => {
  try {
    const household = await Household.findById(req.user.householdId);
    if (!household) {
      return res.status(404).json({ message: 'Household not found' });
    }

    household.emergencyMode = true;
    await household.save();

    // 1. turn off all power-consuming appliances
    const powerDevices = await Device.find({
      householdId: req.user.householdId,
      deviceType: { $ne: 'door' }
    });

    for (const dev of powerDevices) {
      if (dev.connectionStatus === 'connected') {
        dev.powerState = 'off';
        dev.status = 'In Standby';
        await dev.save();
      }
    }

    // 2. lock all smart security doors
    const doors = await Device.find({
      householdId: req.user.householdId,
      deviceType: 'door'
    });

    for (const door of doors) {
      door.features.isLocked = true;
      await door.save();
    }

    // 3. create high-severity emergency alert
    const alert = await Alert.create({
      householdId: req.user.householdId,
      type: 'emergency',
      severity: 'critical',
      message: '🚨 EMERGENCY MODE ACTIVATED: All appliances switched off and virtual doors securely locked.'
    });

    res.status(200).json({
      message: 'Emergency Mode Activated: All appliances switched off and virtual doors locked',
      emergencyMode: true,
      appliancesTurnedOff: powerDevices.length,
      doorsLocked: doors.length,
      alert
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error activating emergency mode', error: error.message });
  }
};

// POST /api/smart/emergency/deactivate - deactivate emergency mode
const deactivateEmergencyMode = async (req, res) => {
  try {
    const household = await Household.findById(req.user.householdId);
    if (!household) {
      return res.status(404).json({ message: 'Household not found' });
    }

    household.emergencyMode = false;
    await household.save();

    await Alert.updateMany(
      { householdId: req.user.householdId, type: 'emergency', isResolved: false },
      { isResolved: true }
    );

    res.status(200).json({
      message: 'Emergency Mode Deactivated. Home returned to standard operating mode.',
      emergencyMode: false
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deactivating emergency mode', error: error.message });
  }
};

// POST /api/smart/voice-command - simulated voice command interface
const processVoiceCommand = async (req, res) => {
  try {
    const { command } = req.body;

    if (!command || typeof command !== 'string') {
      return res.status(400).json({ message: 'Voice command text is required' });
    }

    const cleanCommand = command.trim().toLowerCase();
    let responseText = '';
    let affectedCount = 0;

    // Pattern 1: Emergency command
    if (cleanCommand.includes('emergency') || cleanCommand.includes('panic')) {
      await activateEmergencyMode(req, res);
      return;
    }

    // Pattern 2: Turn off all lights
    if (cleanCommand.includes('turn off') && (cleanCommand.includes('light') || cleanCommand.includes('lamp'))) {
      const lights = await Device.find({
        householdId: req.user.householdId,
        deviceType: 'lamp',
        connectionStatus: 'connected'
      });

      for (const light of lights) {
        light.powerState = 'off';
        light.status = 'In Standby';
        await light.save();
      }
      affectedCount = lights.length;
      responseText = `I have turned off ${affectedCount} light(s) across your home.`;
    }
    // Pattern 3: Turn on all lights
    else if (cleanCommand.includes('turn on') && (cleanCommand.includes('light') || cleanCommand.includes('lamp'))) {
      const lights = await Device.find({
        householdId: req.user.householdId,
        deviceType: 'lamp',
        connectionStatus: 'connected'
      });

      for (const light of lights) {
        light.powerState = 'on';
        light.status = 'On';
        await light.save();
      }
      affectedCount = lights.length;
      responseText = `I have turned on ${affectedCount} light(s).`;
    }
    // Pattern 4: Turn off all appliances / devices
    else if (cleanCommand.includes('turn off all') || cleanCommand.includes('shutdown everything')) {
      const devices = await Device.find({
        householdId: req.user.householdId,
        connectionStatus: 'connected',
        deviceType: { $ne: 'door' }
      });

      for (const dev of devices) {
        dev.powerState = 'off';
        dev.status = 'In Standby';
        await dev.save();
      }
      affectedCount = devices.length;
      responseText = `Turned off all ${affectedCount} appliances in your home.`;
    }
    // Pattern 5: Lock doors
    else if (cleanCommand.includes('lock') && cleanCommand.includes('door')) {
      const doors = await Device.find({
        householdId: req.user.householdId,
        deviceType: 'door',
        connectionStatus: 'connected'
      });

      for (const door of doors) {
        door.features.isLocked = true;
        await door.save();
      }
      affectedCount = doors.length;
      responseText = `All ${affectedCount} virtual door locks are now locked and secured.`;
    }
    // Pattern 6: Set thermostat temperature (e.g. "set thermostat to 22")
    else if (cleanCommand.includes('thermostat') || cleanCommand.includes('temperature')) {
      const match = cleanCommand.match(/\d+/);
      const targetTemp = match ? parseInt(match[0], 10) : 22;

      const thermostats = await Device.find({
        householdId: req.user.householdId,
        deviceType: 'thermostat',
        connectionStatus: 'connected'
      });

      for (const th of thermostats) {
        th.features.temperature = Math.min(30, Math.max(18, targetTemp));
        await th.save();
      }
      affectedCount = thermostats.length;
      responseText = `Adjusted thermostat temperature to ${targetTemp}°C.`;
    }
    // Pattern 7: Good night
    else if (cleanCommand.includes('good night') || cleanCommand.includes('sleep mode')) {
      const devices = await Device.find({
        householdId: req.user.householdId,
        connectionStatus: 'connected',
        deviceType: { $in: ['lamp', 'tv', 'coffeemaker'] }
      });

      for (const dev of devices) {
        dev.powerState = 'off';
        dev.status = 'In Standby';
        await dev.save();
      }

      // lock doors
      await Device.updateMany(
        { householdId: req.user.householdId, deviceType: 'door' },
        { 'features.isLocked': true }
      );

      responseText = 'Good night! Lights and entertainment systems switched off, and all doors are locked.';
    }
    // Fallback: command unrecognized
    else {
      responseText = `Sorry, I heard "${command}", but could not find a matching smart home action. Try: "Turn off all lights", "Lock all doors", "Set thermostat to 22", or "Activate emergency mode".`;
    }

    res.status(200).json({
      commandReceived: command,
      assistantResponse: responseText,
      affectedDevicesCount: affectedCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error processing voice command', error: error.message });
  }
};

// GET /api/smart/usage-prediction - simulated usage prediction algorithm
const getUsagePrediction = async (req, res) => {
  try {
    const devices = await Device.find({ householdId: req.user.householdId });
    const routines = await Routine.find({ householdId: req.user.householdId });

    const predictions = [];

    // Analyze thermostat adjustments
    const thermostat = devices.find(d => d.deviceType === 'thermostat');
    if (thermostat) {
      predictions.push({
        deviceType: 'thermostat',
        deviceName: thermostat.name,
        confidence: '92%',
        pattern: 'Adjusted every morning at 07:00 AM to 22°C',
        suggestion: 'Create an automated morning routine to set the thermostat to 22°C daily at 07:00 AM.'
      });
    }

    // Analyze lights pattern
    const lamps = devices.filter(d => d.deviceType === 'lamp');
    if (lamps.length > 0) {
      predictions.push({
        deviceType: 'lamp',
        deviceName: lamps[0].name,
        confidence: '88%',
        pattern: 'Living Room lights turned on weekdays around 06:45 PM',
        suggestion: 'Automate evening lighting to turn on ambient lights at sunset (06:45 PM).'
      });
    }

    // Coffee maker morning prediction
    const coffeeMaker = devices.find(d => d.deviceType === 'coffeemaker');
    if (coffeeMaker) {
      predictions.push({
        deviceType: 'coffeemaker',
        deviceName: coffeeMaker.name,
        confidence: '95%',
        pattern: 'Turned on between 07:30 AM and 08:00 AM on weekdays',
        suggestion: 'Link coffee maker with the Morning Wakeup Routine for fresh brew upon waking.'
      });
    }

    // General night shutdown prediction
    predictions.push({
      deviceType: 'general',
      deviceName: 'Household Appliances',
      confidence: '85%',
      pattern: 'Multiple devices left in standby between 11:30 PM and 06:00 AM',
      suggestion: 'Enable automated Night Cutoff Routine at 11:30 PM to save standby electricity.'
    });

    res.status(200).json({
      message: 'Usage patterns and automation predictions generated successfully',
      predictionsCount: predictions.length,
      predictions
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error calculating predictions', error: error.message });
  }
};

// GET /api/smart/energy-recommendations - simulated efficiency recommendations
const getEnergyRecommendations = async (req, res) => {
  try {
    const devices = await Device.find({ householdId: req.user.householdId });

    const recommendations = [];

    // Check AC / Heater high consumption
    const ac = devices.find(d => d.deviceType === 'ac');
    if (ac) {
      recommendations.push({
        category: 'Cooling Efficiency',
        priority: 'High',
        potentialSavings: '15% - 20% on cooling costs',
        recommendation: `Switch ${ac.name} from Cool to Eco mode and keep temperature at 24°C instead of 18°C. This saves up to 2.4 kWh per 8 hours.`
      });
    }

    const heater = devices.find(d => d.deviceType === 'heater');
    if (heater) {
      recommendations.push({
        category: 'Heating Safety & Consumption',
        priority: 'Critical',
        potentialSavings: 'Save ~4.0 kWh daily',
        recommendation: `Water/Space heater draws 2000W. Enable automatic 2-hour shutoff timer to prevent overheating and wasteful power draw.`
      });
    }

    // Standby devices recommendation
    const standbyCount = devices.filter(d => d.status === 'In Standby').length;
    recommendations.push({
      category: 'Vampire Draw Reduction',
      priority: 'Medium',
      potentialSavings: 'Save ~1.2 kWh daily',
      recommendation: `You have ${standbyCount} appliances in standby mode. Schedule a "Sleep Mode" routine at night to cut phantom power drain.`
    });

    // Lighting recommendation
    recommendations.push({
      category: 'Smart Dimming',
      priority: 'Low',
      potentialSavings: 'Save ~0.5 kWh daily',
      recommendation: 'Reduce smart lamp brightness from 100% to 75% in the evening to prolong bulb life and save energy.'
    });

    res.status(200).json({
      message: 'Simulated energy efficiency recommendations generated',
      recommendationsCount: recommendations.length,
      recommendations
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating recommendations', error: error.message });
  }
};

module.exports = {
  activateEmergencyMode,
  deactivateEmergencyMode,
  processVoiceCommand,
  getUsagePrediction,
  getEnergyRecommendations
};
