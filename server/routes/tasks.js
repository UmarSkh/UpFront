const express = require('express');
const multer = require('multer');
const Task = require('../models/Task');
const User = require('../models/User');
const Proof = require('../models/Proof');
const Transaction = require('../models/Transaction');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const authMiddleware = (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ message: 'Unauthorized' });
  req.userId = userId;
  next();
};

// Create a new task
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, type, source, destination, credits } = req.body;
    const user = await User.findById(req.userId);
    if (!user || user.credits < credits) {
      return res.status(400).json({ message: 'Insufficient Moral Credits' });
    }
    const task = new Task({ creator: req.userId, title, description, type, source, destination, credits });
    await task.save();
    user.credits -= credits;
    await user.save();

    await Transaction.create({
      fromUser: req.userId,
      toUser: req.userId,
      amount: -credits,
      task: task._id,
      description: `Credits locked for task: ${title}`
    });

    const populatedTask = await Task.findById(task._id).populate('creator', 'name picture');
    const io = req.app.get('io');
    io.emit('taskCreated', populatedTask);
    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Get all available tasks (Open state, not yours)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const tasks = await Task.find({ status: 'Searching', creator: { $ne: req.userId } })
      .populate('creator', 'name picture')
      .sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get a single task by ID
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('creator', 'name picture email')
      .populate('runner', 'name picture email');
    if (!task) return res.status(404).json({ message: 'Task not found' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

// Get my tasks (created + running)
router.get('/me/all', authMiddleware, async (req, res) => {
  try {
    const created = await Task.find({ creator: req.userId })
      .populate('runner', 'name picture')
      .sort({ createdAt: -1 });
    const running = await Task.find({ runner: req.userId })
      .populate('creator', 'name picture')
      .sort({ createdAt: -1 });
    res.json({ created, running });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Accept a task
router.post('/:id/accept', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'Searching') return res.status(400).json({ message: 'Task is no longer available' });
    if (task.creator.toString() === req.userId) return res.status(400).json({ message: 'Cannot accept your own task' });
    task.runner = req.userId;
    task.status = 'Matched';
    await task.save();
    const io = req.app.get('io');
    io.emit('taskAccepted', task._id);
    io.to(`task_${task._id}`).emit('statusUpdated', { taskId: task._id, status: 'Matched' });
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Failed to accept task' });
  }
});

// Update task status (runner moves task forward)
router.patch('/:id/status', authMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const validStatuses = ['In Progress', 'Proof', 'Completed', 'Cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const isRunner = task.runner && task.runner.toString() === req.userId;
    const isCreator = task.creator.toString() === req.userId;

    if (!isRunner && !isCreator) return res.status(403).json({ message: 'Not authorized' });

    // Refund logic for cancellation
    if (status === 'Cancelled') {
      if (!isCreator) return res.status(403).json({ message: 'Only creator can cancel' });
      if (task.status !== 'Searching') return res.status(400).json({ message: 'Cannot cancel after task is accepted' });
      
      const creator = await User.findById(task.creator);
      creator.credits += task.credits;
      await creator.save();

      await Transaction.create({
        toUser: task.creator,
        amount: task.credits,
        task: task._id,
        description: `Refund for cancelled task: ${task.title}`
      });
    }

    // If task completed — give credits to runner
    if (status === 'Completed' && task.runner) {
      if (task.status === 'Completed') return res.status(400).json({ message: 'Already completed' });
      const runner = await User.findById(task.runner);
      if (runner) {
        runner.credits += task.credits;
        await runner.save();
        await Transaction.create({
          fromUser: task.creator,
          toUser: task.runner,
          amount: task.credits,
          task: task._id,
          description: `Task completed: ${task.title}`
        });
      }
    }

    task.status = status;
    await task.save();

    const io = req.app.get('io');
    io.to(`task_${task._id}`).emit('statusUpdated', { taskId: task._id, status: task.status });
    if (status === 'Cancelled') io.emit('taskAccepted', task._id); // Remove from dashboard

    res.json(task);
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ message: 'Failed to update status' });
  }
});

// Upload proof (payment or completion)
router.post('/:id/proof', authMiddleware, upload.single('proof'), async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isParticipant =
      task.creator.toString() === req.userId ||
      (task.runner && task.runner.toString() === req.userId);
    if (!isParticipant) return res.status(403).json({ message: 'Not authorized' });

    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const proof = new Proof({
      task: task._id,
      uploader: req.userId,
      type: req.body.type || 'completion',
      data: req.file.buffer.toString('base64'),
      mimeType: req.file.mimetype
    });
    await proof.save();

    // Advance status to Proof if uploading completion proof
    if (req.body.type === 'completion') {
      task.status = 'Proof';
      await task.save();
      const io = req.app.get('io');
      io.to(`task_${task._id}`).emit('statusUpdated', { taskId: task._id, status: 'Proof' });
    }

    res.json({ message: 'Proof uploaded', proofId: proof._id });
  } catch (error) {
    console.error('Error uploading proof:', error);
    res.status(500).json({ message: 'Failed to upload proof' });
  }
});

// Get proofs for a task
router.get('/:id/proofs', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    const proofs = await Proof.find({ task: req.params.id }).populate('uploader', 'name');
    res.json(proofs);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch proofs' });
  }
});

module.exports = router;
