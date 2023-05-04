const mongoose = require('mongoose');

const UsageSchema = new mongoose.Schema({
  user: { type: String },
  departureTime: { type: Date },
  estimatedMileage: { type: Number },
  neededHours: { type: Number },
  averagePrice: { type: Number },
  temperature: { type: String},
});

module.exports = mongoose.model('Usage', UsageSchema);