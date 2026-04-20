const mongoose = require('mongoose');

const proofSchema = new mongoose.Schema({
  task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['payment', 'completion'], required: true },
  data: { type: String, required: true }, // base64 encoded image
  mimeType: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Proof', proofSchema);
