const Device = require('../models/Device.model');
const EnergyLog = require('../models/EnergyLog.model');
const Alert = require('../models/Alert.model');

// GET /api/energy/report - simulated energy consumption report
const getEnergyReport = async (req, res) => {
  try {
    const devices = await Device.find({ householdId: req.user.householdId })
      .populate('roomId', 'name');

    let totalHouseholdKWh = 0;
    const deviceBreakdown = [];
    const roomBreakdownMap = {};

    devices.forEach((dev) => {
      // simulated kWh based on total run hours and rated wattage
      // if device has 0 run hours but is currently 'On', simulate minimal active time
      let hours = dev.totalRunHours;
      if (dev.powerState === 'on' && hours === 0) {
        hours = 2; // simulated 2 hours baseline if currently running
      }

      const consumedKWh = Number(((dev.wattage * hours) / 1000).toFixed(2));
      totalHouseholdKWh += consumedKWh;

      const roomName = dev.roomId ? dev.roomId.name : 'Unassigned';

      deviceBreakdown.push({
        deviceId: dev._id,
        name: dev.name,
        deviceType: dev.deviceType,
        room: roomName,
        wattage: dev.wattage,
        runHours: Number(hours.toFixed(1)),
        energyConsumedKWh: consumedKWh
      });

      if (!roomBreakdownMap[roomName]) {
        roomBreakdownMap[roomName] = 0;
      }
      roomBreakdownMap[roomName] = Number((roomBreakdownMap[roomName] + consumedKWh).toFixed(2));
    });

    totalHouseholdKWh = Number(totalHouseholdKWh.toFixed(2));
    const estimatedCost = Number((totalHouseholdKWh * 0.15).toFixed(2)); // $0.15 per kWh rate

    res.status(200).json({
      summary: {
        totalDevices: devices.length,
        totalEnergyConsumedKWh: totalHouseholdKWh,
        unitRateUSD: 0.15,
        estimatedCostUSD: estimatedCost,
        billingCycle: 'Last 7 Days (Simulated)'
      },
      roomBreakdown: roomBreakdownMap,
      deviceBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error generating energy report', error: error.message });
  }
};

// GET /api/energy/alerts - get malfunction and system alerts
const getAlerts = async (req, res) => {
  try {
    const alerts = await Alert.find({ householdId: req.user.householdId })
      .populate('deviceId', 'name deviceType status')
      .sort({ createdAt: -1 });

    const activeAlerts = alerts.filter(a => !a.isResolved);
    const resolvedAlerts = alerts.filter(a => a.isResolved);

    res.status(200).json({
      totalCount: alerts.length,
      activeCount: activeAlerts.length,
      alerts: activeAlerts,
      history: resolvedAlerts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching alerts', error: error.message });
  }
};

// PATCH /api/energy/alerts/:id/resolve - dismiss or resolve alert
const resolveAlert = async (req, res) => {
  try {
    const { id } = req.params;

    const alert = await Alert.findOne({ _id: id, householdId: req.user.householdId });
    if (!alert) {
      return res.status(404).json({ message: 'Alert not found' });
    }

    alert.isResolved = true;
    await alert.save();

    res.status(200).json({
      message: 'Alert resolved successfully',
      alert
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error resolving alert', error: error.message });
  }
};

module.exports = {
  getEnergyReport,
  getAlerts,
  resolveAlert
};
