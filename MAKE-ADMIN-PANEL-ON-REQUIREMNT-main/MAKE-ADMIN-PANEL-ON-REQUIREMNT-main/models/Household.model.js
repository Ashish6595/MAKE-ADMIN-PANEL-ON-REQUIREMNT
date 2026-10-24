const mongoose = require('mongoose');

const householdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    emergencyMode: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const Household = mongoose.model('Household', householdSchema);
module.exports = Household;
