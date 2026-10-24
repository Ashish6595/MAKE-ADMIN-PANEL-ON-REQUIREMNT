const mongoose = require('mongoose');

const deviceGroupSchema = new mongoose.Schema(
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
    deviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Device'
      }
    ]
  },
  {
    timestamps: true
  }
);

const DeviceGroup = mongoose.model('DeviceGroup', deviceGroupSchema);
module.exports = DeviceGroup;
