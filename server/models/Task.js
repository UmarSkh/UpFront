const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  runner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: { type: String, required: true },
  description: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['Searching', 'Matched', 'In Progress', 'Proof', 'Completed', 'Cancelled'], 
    default: 'Searching' 
  },
  credits: { type: Number, required: true },
  source: { type: String, required: true },
  destination: { type: String }, // Optional
  type: { type: String, enum: ['Info', 'Delivery'], default: 'Delivery' }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
