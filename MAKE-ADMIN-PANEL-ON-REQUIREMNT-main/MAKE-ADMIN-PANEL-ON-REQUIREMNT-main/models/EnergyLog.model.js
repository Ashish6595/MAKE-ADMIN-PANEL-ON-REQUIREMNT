const mongoose = require('mongoose');

const energyLogSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true
    },
    hoursUsed: {
      type: Number,
      required: true
    },
    energyConsumedKWh: {
      type: Number,
      required: true
    },
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

const EnergyLog = mongoose.model('EnergyLog', energyLogSchema);
module.exports = EnergyLog;
