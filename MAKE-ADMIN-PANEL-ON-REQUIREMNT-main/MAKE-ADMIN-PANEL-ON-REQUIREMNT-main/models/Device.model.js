const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    deviceType: {
      type: String,
      enum: ['lamp', 'fan', 'thermostat', 'ac', 'heater', 'door', 'coffeemaker', 'tv', 'general'],
      required: true
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      required: true
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      required: true
    },
    // simulated device connection state (must click connect to activate)
    connectionStatus: {
      type: String,
      enum: ['connected', 'disconnected'],
      default: 'disconnected'
    },
    // power state: on or off
    powerState: {
      type: String,
      enum: ['on', 'off'],
      default: 'off'
    },
    // overall simulated device status
    status: {
      type: String,
      enum: ['On', 'In Standby', 'Malfunctioning', 'Disconnected'],
      default: 'Disconnected'
    },
    // rated wattage for simulated energy calculation
    wattage: {
      type: Number,
      default: 60
    },
    lastTurnedOn: {
      type: Date,
      default: null
    },
    totalRunHours: {
      type: Number,
      default: 0
    },
    isMalfunctioning: {
      type: Boolean,
      default: false
    },
    malfunctionReason: {
      type: String,
      default: null
    },
    // configurable features per device type
    features: {
      brightness: {
        type: Number,
        min: 0,
        max: 100,
        default: 100
      },
      colorMode: {
        type: String,
        enum: ['Warm', 'Cold', 'Daylight'],
        default: 'Warm'
      },
      speed: {
        type: String,
        enum: ['Low', 'Medium', 'High'],
        default: 'Medium'
      },
      temperature: {
        type: Number,
        default: 24
      },
      minTemp: {
        type: Number,
        default: 18
      },
      maxTemp: {
        type: Number,
        default: 30
      },
      mode: {
        type: String,
        default: 'Cool'
      },
      isLocked: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

const Device = mongoose.model('Device', deviceSchema);
module.exports = Device;
