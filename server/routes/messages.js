const express = require('express');
const Message = require('../models/Message');
const Task = require('../models/Task');

const router = express.Router();

const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  req.userId = userId;
  next();
};

// Get all messages for a task
router.get('/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    // Only creator or runner can view messages
    const isParticipant =
      task.creator.toString() === req.userId ||
      (task.runner && task.runner.toString() === req.userId);

    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    const messages = await Message.find({ task: req.params.taskId })
      .populate('sender', 'name picture')
      .sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Failed to fetch messages' });
  }
});

module.exports = router;
