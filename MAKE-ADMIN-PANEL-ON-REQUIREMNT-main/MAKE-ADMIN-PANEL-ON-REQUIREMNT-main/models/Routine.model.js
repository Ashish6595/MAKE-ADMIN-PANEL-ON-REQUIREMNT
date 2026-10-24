const mongoose = require('mongoose');

const routineActionSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  targetPowerState: {
    type: String,
    enum: ['on', 'off'],
    required: true
  },
  targetSettings: {
    type: Object,
    default: {}
  }
});

const routineSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    scheduledTime: {
      type: String,
      default: '22:00'
    },
    repeatDays: {
      type: [String],
      default: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    },
    isActive: {
      type: Boolean,
      default: true
    },
    actions: [routineActionSchema],
    lastExecuted: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const Routine = mongoose.model('Routine', routineSchema);
module.exports = Routine;
