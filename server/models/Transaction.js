const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  fromUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Null if from system (e.g., initial signup)
  toUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' }, // Null if not related to a specific task (e.g., initial signup)
  description: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
