const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null
    },
    type: {
      type: String,
      enum: ['malfunction', 'emergency', 'warning', 'energy_warning'],
      default: 'warning'
    },
    message: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    isResolved: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Alert = mongoose.model('Alert', alertSchema);
module.exports = Alert;
